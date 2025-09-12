/**
 * 测试用户数据API
 * 用于验证数据库中的用户数据是否能正确获取
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    console.log('Testing user data retrieval...');
    
    // 首先检查users表是否存在
    const tableCheck = db.prepare(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'users'
    `).get();
    
    if (!tableCheck) {
      return NextResponse.json({
        success: false,
        error: 'users表不存在',
        tables: db.prepare(`
          SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'
        `).all()
      });
    }
    
    // 获取users表的结构
    const tableInfo = db.prepare('PRAGMA table_info(users)').all();
    console.log('Users table structure:', tableInfo);
    
    // 获取用户总数
    const countResult = db.prepare('SELECT COUNT(*) as total FROM users').get() as { total: number };
    console.log('Total users:', countResult.total);
    
    // 获取前5个用户
    const users = db.prepare(`
      SELECT * FROM users LIMIT 5
    `).all();
    
    console.log('Sample users:', users);
    
    return NextResponse.json({
      success: true,
      data: {
        tableExists: true,
        tableStructure: tableInfo,
        totalUsers: countResult.total,
        sampleUsers: users
      }
    });
    
  } catch (error) {
    console.error('Test users API error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}