import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 记录音频播放次数
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: audioId } = await params;
    
    if (!audioId) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_AUDIO_ID',
          message: '音频ID不能为空'
        }
      }, { status: 400 });
    }

    // 更新播放次数（MySQL不支持RETURNING，需要分两步）
    const updateQuery = `
      UPDATE audios 
      SET play_count = COALESCE(play_count, 0) + 1
      WHERE id = ?
    `;

    await db.query(updateQuery, [audioId]);
    
    // 查询更新后的数据
    const selectQuery = `
      SELECT id, title, play_count
      FROM audios
      WHERE id = ?
    `;
    
    const result = await db.query(selectQuery, [audioId]);
    
    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'AUDIO_NOT_FOUND',
          message: '音频不存在'
        }
      }, { status: 404 });
    }

    const updatedAudio = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        audioId: updatedAudio.id,
        title: updatedAudio.title,
        playCount: updatedAudio.play_count
      },
      meta: {
        requestId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        version: '1.0.0'
      }
    });

  } catch (error) {
    console.error('记录播放次数失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'UPDATE_PLAY_COUNT_FAILED',
        message: '记录播放次数失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}
