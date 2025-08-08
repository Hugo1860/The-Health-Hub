import { NextRequest, NextResponse } from 'next/server';
import { readFile, stat } from 'fs/promises';
import { join } from 'path';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const { id } = params;
    
    // 读取音频列表获取文件信息
    const audioListPath = join(process.cwd(), 'public', 'uploads', 'audio-list.json');
    const audioListData = await readFile(audioListPath, 'utf-8');
    const audioList = JSON.parse(audioListData);
    
    const audio = audioList.find((item: any) => item.id === id);
    if (!audio) {
      return NextResponse.json(
        { error: '音频不存在' },
        { status: 404 }
      );
    }
    
    const filePath = join(process.cwd(), 'public', audio.url);
    
    // 获取文件统计信息
    const stats = await stat(filePath);
    const fileSize = stats.size;
    
    // 解析Range头部
    const range = request.headers.get('range');
    
    if (range) {
      // 处理范围请求（流式传输）
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = (end - start) + 1;
      
      // 读取文件的指定范围
      const file = await readFile(filePath);
      const chunk = file.slice(start, end + 1);
      
      return new NextResponse(chunk, {
        status: 206, // Partial Content
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000', // 1年缓存
        },
      });
    } else {
      // 返回完整文件
      const file = await readFile(filePath);
      
      return new NextResponse(file, {
        status: 200,
        headers: {
          'Content-Length': fileSize.toString(),
          'Content-Type': 'audio/mpeg',
          'Accept-Ranges': 'bytes',
          'Cache-Control': 'public, max-age=31536000', // 1年缓存
        },
      });
    }
    
  } catch (error) {
    console.error('Error streaming audio:', error);
    return NextResponse.json(
      { error: '音频流传输失败' },
      { status: 500 }
    );
  }
}