import { NextRequest, NextResponse } from 'next/server';
import { audioStreamOptimizer } from '@/lib/AudioStreamOptimizer';
import { optimizedDb } from '@/lib/OptimizedDatabase';
import { z } from 'zod';

// 断点续传状态存储
const resumeStates = new Map<string, {
  audioId: string;
  userId: string;
  position: number;
  timestamp: number;
  sessionId: string;
}>();

// 查询参数验证
const resumeQuerySchema = z.object({
  user_id: z.string().min(1, 'User ID is required'),
  session_id: z.string().min(1, 'Session ID is required'),
  position: z.coerce.number().min(0).optional(),
  quality: z.enum(['auto', 'high', 'medium', 'low']).optional().default('auto')
});

// 保存播放位置
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id: audioId } = params;
    
    const body = await request.json();
    const validation = resumeQuerySchema.safeParse(body);
    
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid request parameters',
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const { user_id, session_id, position = 0 } = validation.data;

    // 验证音频是否存在
    const audioMetadata = await audioStreamOptimizer.getAudioMetadata(audioId);
    if (!audioMetadata) {
      return NextResponse.json({
        error: 'Audio not found'
      }, { status: 404 });
    }

    // 验证位置是否有效
    if (position > audioMetadata.duration) {
      return NextResponse.json({
        error: 'Invalid position',
        maxDuration: audioMetadata.duration
      }, { status: 400 });
    }

    // 保存断点续传状态
    const stateKey = `${user_id}_${audioId}`;
    resumeStates.set(stateKey, {
      audioId,
      userId: user_id,
      position,
      timestamp: Date.now(),
      sessionId: session_id
    });

    // 可选：保存到数据库以实现持久化
    try {
      await optimizedDb.execute(
        `INSERT OR REPLACE INTO audio_resume_states 
         (user_id, audio_id, position, session_id, updated_at) 
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [user_id, audioId, position, session_id]
      );
    } catch (dbError) {
      console.warn('Failed to save resume state to database:', dbError);
      // 继续执行，不影响主要功能
    }

    return NextResponse.json({
      success: true,
      message: 'Resume position saved',
      data: {
        audioId,
        userId: user_id,
        position,
        duration: audioMetadata.duration,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Failed to save resume position:', error);
    return NextResponse.json({
      error: 'Failed to save resume position',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 获取断点续传位置并开始流传输
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id: audioId } = params;
    
    const searchParams = request.nextUrl.searchParams;
    const queryParams = Object.fromEntries(searchParams.entries());
    
    const validation = resumeQuerySchema.safeParse(queryParams);
    if (!validation.success) {
      return NextResponse.json({
        error: 'Invalid query parameters',
        details: validation.error.flatten()
      }, { status: 400 });
    }

    const { user_id, session_id, position: requestedPosition, quality } = validation.data;

    // 获取音频元数据
    const audioMetadata = await audioStreamOptimizer.getAudioMetadata(audioId);
    if (!audioMetadata) {
      return NextResponse.json({
        error: 'Audio not found'
      }, { status: 404 });
    }

    // 获取保存的断点续传位置
    let resumePosition = requestedPosition || 0;
    const stateKey = `${user_id}_${audioId}`;
    
    if (resumeStates.has(stateKey)) {
      const savedState = resumeStates.get(stateKey)!;
      resumePosition = savedState.position;
    } else {
      // 尝试从数据库获取
      try {
        const savedState = await optimizedDb.queryOne<{
          position: number;
          session_id: string;
          updated_at: string;
        }>(
          `SELECT position, session_id, updated_at 
           FROM audio_resume_states 
           WHERE user_id = ? AND audio_id = ? 
           ORDER BY updated_at DESC 
           LIMIT 1`,
          [user_id, audioId]
        );

        if (savedState) {
          resumePosition = savedState.position;
          // 更新内存缓存
          resumeStates.set(stateKey, {
            audioId,
            userId: user_id,
            position: resumePosition,
            timestamp: new Date(savedState.updated_at).getTime(),
            sessionId: savedState.session_id
          });
        }
      } catch (dbError) {
        console.warn('Failed to load resume state from database:', dbError);
      }
    }

    // 计算字节偏移量（假设平均比特率）
    const averageBytesPerSecond = audioMetadata.fileSize / audioMetadata.duration;
    const byteOffset = Math.floor(resumePosition * averageBytesPerSecond);

    // 确保偏移量不超过文件大小
    const safeOffset = Math.min(byteOffset, audioMetadata.fileSize - 1);

    // 构建Range头
    const range = {
      start: safeOffset,
      end: audioMetadata.fileSize - 1
    };

    // 创建流媒体选项
    const streamingOptions = {
      quality,
      adaptiveBitrate: true,
      enableCompression: true,
      chunkSize: 64 * 1024, // 64KB chunks
      bufferSize: 1024 * 1024, // 1MB buffer
      networkSpeed: undefined
    };

    // 创建音频流
    const streamResult = await audioStreamOptimizer.createOptimizedStream(
      audioId,
      streamingOptions,
      range
    );

    // 添加断点续传相关的头部信息
    const enhancedHeaders = {
      ...streamResult.headers,
      'X-Resume-Position': resumePosition.toString(),
      'X-Resume-Byte-Offset': safeOffset.toString(),
      'X-Resume-Enabled': 'true',
      'X-Session-ID': session_id,
      'X-User-ID': user_id,
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Expose-Headers': 'X-Resume-Position, X-Resume-Byte-Offset, Content-Range'
    };

    console.log(`Resume playback: ${audioId} for user ${user_id} at ${resumePosition}s (${safeOffset} bytes)`);

    return new NextResponse(streamResult.stream, {
      status: streamResult.status,
      headers: enhancedHeaders
    });

  } catch (error) {
    console.error('Resume playback failed:', error);
    return NextResponse.json({
      error: 'Resume playback failed',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 删除断点续传状态
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id: audioId } = params;
    
    const searchParams = request.nextUrl.searchParams;
    const userId = searchParams.get('user_id');
    
    if (!userId) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }

    // 从内存中删除
    const stateKey = `${userId}_${audioId}`;
    const deleted = resumeStates.delete(stateKey);

    // 从数据库中删除
    try {
      await optimizedDb.execute(
        `DELETE FROM audio_resume_states 
         WHERE user_id = ? AND audio_id = ?`,
        [userId, audioId]
      );
    } catch (dbError) {
      console.warn('Failed to delete resume state from database:', dbError);
    }

    return NextResponse.json({
      success: true,
      message: deleted ? 'Resume state deleted' : 'Resume state not found',
      data: {
        audioId,
        userId,
        deleted
      }
    });

  } catch (error) {
    console.error('Failed to delete resume state:', error);
    return NextResponse.json({
      error: 'Failed to delete resume state',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 获取用户的所有断点续传状态
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { user_id } = body;
    
    if (!user_id) {
      return NextResponse.json({
        error: 'User ID is required'
      }, { status: 400 });
    }

    // 从内存获取用户的所有状态
    const userStates = Array.from(resumeStates.entries())
      .filter(([key, state]) => state.userId === user_id)
      .map(([key, state]) => ({
        audioId: state.audioId,
        position: state.position,
        timestamp: new Date(state.timestamp).toISOString(),
        sessionId: state.sessionId
      }));

    // 从数据库获取（如果内存中没有）
    try {
      const dbStates = await optimizedDb.query<{
        audio_id: string;
        position: number;
        session_id: string;
        updated_at: string;
      }>(
        `SELECT audio_id, position, session_id, updated_at 
         FROM audio_resume_states 
         WHERE user_id = ? 
         ORDER BY updated_at DESC`,
        [user_id]
      );

      // 合并数据库和内存中的状态
      const allStates = new Map();
      
      // 先添加数据库中的状态
      dbStates.forEach(state => {
        allStates.set(state.audio_id, {
          audioId: state.audio_id,
          position: state.position,
          timestamp: state.updated_at,
          sessionId: state.session_id,
          source: 'database'
        });
      });

      // 内存中的状态优先级更高
      userStates.forEach(state => {
        allStates.set(state.audioId, {
          ...state,
          source: 'memory'
        });
      });

      const finalStates = Array.from(allStates.values());

      return NextResponse.json({
        success: true,
        data: {
          userId: user_id,
          resumeStates: finalStates,
          count: finalStates.length
        }
      });

    } catch (dbError) {
      console.warn('Failed to load resume states from database:', dbError);
      
      // 只返回内存中的状态
      return NextResponse.json({
        success: true,
        data: {
          userId: user_id,
          resumeStates: userStates,
          count: userStates.length
        },
        warning: 'Database unavailable, showing memory states only'
      });
    }

  } catch (error) {
    console.error('Failed to get resume states:', error);
    return NextResponse.json({
      error: 'Failed to get resume states',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}