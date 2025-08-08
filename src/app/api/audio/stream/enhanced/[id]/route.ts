import { NextRequest, NextResponse } from 'next/server';
import { audioStreamOptimizer } from '@/lib/AudioStreamOptimizer';
import { networkMonitor } from '@/lib/NetworkMonitor';
import { z } from 'zod';

// 查询参数验证schema
const streamQuerySchema = z.object({
  quality: z.enum(['auto', 'high', 'medium', 'low']).optional().default('auto'),
  adaptive: z.coerce.boolean().optional().default(true),
  compression: z.coerce.boolean().optional().default(true),
  chunk_size: z.coerce.number().min(1024).max(1024 * 1024).optional(),
  network_speed: z.coerce.number().min(0.1).max(100).optional(),
  format: z.enum(['mp3', 'aac', 'opus', 'wav']).optional()
});

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startTime = performance.now();
  
  try {
    const params = await context.params;
    const { id: audioId } = params;
    
    // 验证查询参数
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validation = streamQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const {
      quality,
      adaptive,
      compression,
      chunk_size,
      network_speed,
      format
    } = validation.data;

    // 获取音频元数据
    const metadata = await audioStreamOptimizer.getAudioMetadata(audioId);
    if (!metadata) {
      return NextResponse.json({
        error: 'Audio not found',
        audioId
      }, { status: 404 });
    }

    // 解析Range头
    const rangeHeader = request.headers.get('range');
    const range = rangeHeader 
      ? audioStreamOptimizer.parseRangeHeader(rangeHeader, metadata.fileSize)
      : null;

    // 获取网络状况（如果启用自适应）
    let detectedNetworkSpeed = network_speed;
    if (adaptive && !detectedNetworkSpeed) {
      const networkMetrics = networkMonitor.getCurrentMetrics();
      detectedNetworkSpeed = networkMetrics.speed;
    }

    // 构建流选项
    const streamingOptions = {
      quality,
      adaptiveBitrate: adaptive,
      enableCompression: compression,
      chunkSize: chunk_size || audioStreamOptimizer.calculateOptimalChunkSize(detectedNetworkSpeed, quality),
      bufferSize: 1024 * 1024, // 1MB buffer
      networkSpeed: detectedNetworkSpeed
    };

    // 创建优化的音频流
    const streamResult = await audioStreamOptimizer.createOptimizedStream(
      audioId,
      streamingOptions,
      range || undefined
    );

    // 添加性能和调试头
    const endTime = performance.now();
    const processingTime = Math.round(endTime - startTime);

    const enhancedHeaders = {
      ...streamResult.headers,
      'X-Processing-Time': processingTime.toString(),
      'X-Network-Speed': detectedNetworkSpeed?.toString() || 'unknown',
      'X-Adaptive-Enabled': adaptive.toString(),
      'X-Chunk-Size': streamingOptions.chunkSize.toString(),
      'X-Audio-ID': audioId,
      'X-Stream-Version': '2.0',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Range, Content-Type',
      'Access-Control-Expose-Headers': 'Content-Range, Content-Length, X-Audio-Quality'
    };

    // 记录流媒体访问（用于分析）
    console.log(`Audio stream: ${audioId}, quality: ${quality}, network: ${detectedNetworkSpeed}Mbps, range: ${range ? `${range.start}-${range.end}` : 'full'}`);

    return new NextResponse(streamResult.stream, {
      status: streamResult.status,
      headers: enhancedHeaders
    });

  } catch (error) {
    const endTime = performance.now();
    const processingTime = Math.round(endTime - startTime);
    
    console.error('Enhanced audio streaming failed:', error);
    
    return NextResponse.json({
      error: 'Audio streaming failed',
      details: error instanceof Error ? error.message : 'Unknown error',
      processingTime,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

// 获取音频流信息（不传输实际数据）
export async function HEAD(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id: audioId } = params;

    const metadata = await audioStreamOptimizer.getAudioMetadata(audioId);
    if (!metadata) {
      return new NextResponse(null, { status: 404 });
    }

    const headers = {
      'Content-Type': 'audio/mpeg',
      'Content-Length': metadata.fileSize.toString(),
      'Accept-Ranges': 'bytes',
      'X-Audio-Duration': metadata.duration.toString(),
      'X-Audio-Bitrate': metadata.bitrate.toString(),
      'X-Audio-Format': metadata.format,
      'Cache-Control': 'public, max-age=3600'
    };

    return new NextResponse(null, {
      status: 200,
      headers
    });

  } catch (error) {
    console.error('Audio HEAD request failed:', error);
    return new NextResponse(null, { status: 500 });
  }
}

// 获取音频流选项和支持的格式
export async function OPTIONS(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const supportedFormats = audioStreamOptimizer.getSupportedFormats();
    const qualityProfiles = supportedFormats.map(format => 
      audioStreamOptimizer.getQualityProfile(format)
    ).filter(Boolean);

    return NextResponse.json({
      supportedQualities: ['auto', 'high', 'medium', 'low'],
      supportedFormats,
      qualityProfiles,
      features: {
        adaptiveBitrate: true,
        rangeRequests: true,
        compression: true,
        networkAdaptation: true
      },
      recommendedChunkSizes: {
        high: '256KB',
        medium: '128KB',
        low: '64KB'
      }
    }, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
        'Access-Control-Allow-Headers': 'Range, Content-Type',
        'Cache-Control': 'public, max-age=86400' // 24小时缓存
      }
    });

  } catch (error) {
    console.error('Audio OPTIONS request failed:', error);
    return NextResponse.json({
      error: 'Failed to get streaming options'
    }, { status: 500 });
  }
}