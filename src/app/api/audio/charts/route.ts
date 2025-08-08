import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface AudioFile {
  id: string;
  title: string;
  description: string;
  url: string;
  filename: string;
  uploadDate: string;
  subject: string;
  tags?: string[];
  speaker?: string;
  recordingDate?: string;
  duration?: number;
  playCount?: number;
  likeCount?: number;
  shareCount?: number;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const timeRange = searchParams.get('range') || 'week'; // day, week, month
    const limit = parseInt(searchParams.get('limit') || '10');

    const audioListPath = path.join(process.cwd(), 'data', 'audio-list.json');
    
    if (!fs.existsSync(audioListPath)) {
      return NextResponse.json([], { status: 200 });
    }

    const audioData = fs.readFileSync(audioListPath, 'utf8');
    let audios: AudioFile[] = JSON.parse(audioData);

    // 模拟播放统计数据（实际应用中应该从数据库获取）
    audios = audios.map(audio => ({
      ...audio,
      playCount: Math.floor(Math.random() * 1000) + 10,
      likeCount: Math.floor(Math.random() * 100) + 1,
      shareCount: Math.floor(Math.random() * 50) + 1,
    }));

    // 根据时间范围过滤
    const now = new Date();
    let startDate: Date;

    switch (timeRange) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    }

    // 过滤指定时间范围内的音频
    const filteredAudios = audios.filter(audio => {
      const uploadDate = new Date(audio.uploadDate);
      return uploadDate >= startDate;
    });

    // 计算综合得分并排序
    const rankedAudios = filteredAudios
      .map(audio => ({
        ...audio,
        score: (audio.playCount || 0) * 1 + (audio.likeCount || 0) * 2 + (audio.shareCount || 0) * 3
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit);

    return NextResponse.json(rankedAudios, { status: 200 });
  } catch (error) {
    console.error('获取排行榜失败:', error);
    return NextResponse.json(
      { error: '获取排行榜失败' },
      { status: 500 }
    );
  }
}