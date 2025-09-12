import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

// 直接测试音频数据库查询（无需认证）
export async function GET(request: NextRequest) {
  console.log('=== Direct Audio Test API Called ===');
  
  try {
    // 测试查询
    console.log('Testing PostgreSQL query...');
    const result = await db.query('SELECT * FROM audios ORDER BY ""uploadDate"" DESC LIMIT 5');
    const audios = result.rows;
    
    console.log(`Query successful: ${audios.length} records found`);
    
    // 处理数据
    const processedAudios = audios.map((audio: any) => ({
      id: audio.id,
      title: audio.title,
      subject: audio.subject, uploadDate: audio.uploadDate,
      filename: audio.filename,
      url: audio.url,
      tags: typeof audio.tags === 'string' ? JSON.parse(audio.tags || '[]') : (audio.tags || [])
    }));
    
    return NextResponse.json({
      success: true,
      message: 'Direct audio query test successful',
      count: processedAudios.length,
      audios: processedAudios,
      queryInfo: {
        syntax: 'PostgreSQL',
        table: 'audios',
        orderBy: '"uploadDate" DESC',
        limit: 5
      }
    });
    
  } catch (error) {
    console.error('=== Direct Audio Test Error ===');
    console.error('Error:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : 'Unknown error',
        type: 'DATABASE_ERROR'
      }
    }, { status: 500 });
  }
}