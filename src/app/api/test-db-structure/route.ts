import { NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';

export async function GET() {
  try {
    const db = getDatabase();
    
    // 检查音频表结构
    const audioTableStructure = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'audios'
      ORDER BY ordinal_position
    `);
    
    // 检查分类表结构
    const categoriesTableStructure = await db.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'categories'
      ORDER BY ordinal_position
    `);
    
    // 尝试查询音频表的实际数据（前5条）
    let audioSample = [];
    try {
      const audioData = await db.query(`SELECT * FROM audios LIMIT 5`);
      audioSample = audioData.rows;
    } catch (audioError) {
      console.log('查询音频数据失败:', audioError);
    }
    
    // 检查分类数据
    let categoriesSample = [];
    try {
      const categoriesData = await db.query(`SELECT * FROM categories LIMIT 5`);
      categoriesSample = categoriesData.rows;
    } catch (catError) {
      console.log('查询分类数据失败:', catError);
    }
    
    return NextResponse.json({
      success: true,
      data: {
        audios: audioTableStructure.rows,
        categories: categoriesTableStructure.rows,
        audioSample,
        categoriesSample
      }
    });
  } catch (error) {
    console.error('数据库结构检查失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: error instanceof Error ? error.message : '检查失败'
      }
    }, { status: 500 });
  }
}