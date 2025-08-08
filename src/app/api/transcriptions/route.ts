import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getAudioTranscription, 
  createTranscription, 
  updateTranscriptionStatus,
  saveTranscriptionResult,
  transcribeAudio
} from '@/lib/transcription';
import path from 'path';

// GET - 获取音频转录
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const audioId = searchParams.get('audioId');
    
    if (!audioId) {
      return NextResponse.json(
        { error: '缺少音频ID' },
        { status: 400 }
      );
    }

    const transcription = getAudioTranscription(audioId);
    
    if (!transcription) {
      return NextResponse.json(
        { error: '转录不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json(transcription);
  } catch (error) {
    console.error('Error fetching transcription:', error);
    return NextResponse.json(
      { error: '获取转录失败' },
      { status: 500 }
    );
  }
}

// POST - 开始音频转录
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '需要管理员权限' },
        { status: 403 }
      );
    }

    const { audioId, language = 'zh-CN' } = await request.json();
    
    if (!audioId) {
      return NextResponse.json(
        { error: '缺少音频ID' },
        { status: 400 }
      );
    }

    // 检查是否已存在转录
    let transcription = getAudioTranscription(audioId);
    
    if (transcription && transcription.status === 'completed') {
      return NextResponse.json(transcription);
    }

    // 创建或获取转录记录
    if (!transcription) {
      transcription = createTranscription(audioId, language);
    }

    // 开始转录处理
    processTranscription(audioId, language);

    return NextResponse.json(transcription, { status: 201 });
  } catch (error) {
    console.error('Error starting transcription:', error);
    return NextResponse.json(
      { error: '开始转录失败' },
      { status: 500 }
    );
  }
}

// 异步处理转录
async function processTranscription(audioId: string, language: string) {
  try {
    // 更新状态为处理中
    updateTranscriptionStatus(audioId, 'processing');
    
    // 构建音频文件路径
    const audioFilePath = path.join(process.cwd(), 'public', 'uploads', `${audioId}-*.wav`);
    
    const startTime = Date.now();
    
    // 调用转录服务
    const result = await transcribeAudio(audioFilePath, language);
    
    const processingTime = Date.now() - startTime;
    
    // 保存转录结果
    saveTranscriptionResult(
      audioId,
      result.fullText,
      result.segments,
      processingTime
    );
    
    console.log(`Transcription completed for audio ${audioId} in ${processingTime}ms`);
  } catch (error) {
    console.error('Error processing transcription:', error);
    updateTranscriptionStatus(
      audioId, 
      'failed', 
      error instanceof Error ? error.message : '转录处理失败'
    );
  }
}