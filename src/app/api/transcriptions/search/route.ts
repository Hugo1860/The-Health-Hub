import { NextRequest, NextResponse } from 'next/server';
import { searchTranscriptions } from '@/lib/transcription';

// GET - 搜索转录内容
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const audioId = searchParams.get('audioId');
    
    if (!query || query.trim().length < 2) {
      return NextResponse.json(
        { error: '搜索关键词至少需要2个字符' },
        { status: 400 }
      );
    }

    const results = searchTranscriptions(query.trim(), audioId || undefined);
    
    return NextResponse.json({
      query: query.trim(),
      totalResults: results.length,
      totalMatches: results.reduce((sum, result) => sum + result.matches.length, 0),
      results
    });
  } catch (error) {
    console.error('Error searching transcriptions:', error);
    return NextResponse.json(
      { error: '搜索失败' },
      { status: 500 }
    );
  }
}