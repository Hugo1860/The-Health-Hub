import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import bcrypt from 'bcryptjs';

// 仅在开发环境下可用的创建管理员API
export async function POST(request: NextRequest) {
  // 仅在开发环境下可用
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({
      success: false,
      error: { message: '此API仅在开发环境下可用' }
    }, { status: 403 });
  }

  try {
    const { email, username, password, role = 'admin' } = await request.json();
    
    if (!email || !username || !password) {
      return NextResponse.json({
        success: false,
        error: { message: '邮箱、用户名和密码都是必填的' }
      }, { status: 400 });
    }

    const db = getDatabase();
    
    // 检查用户是否已存在
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = ? OR username = ?',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: { message: '用户已存在' }
      }, { status: 409 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // 生成用户ID
    const userId = Date.now().toString();
    const now = new Date().toISOString();

    // 创建用户
    const result = await db.query(`
      INSERT INTO users (id, username, email, password, role, status, "createdAt", "updatedAt")
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      RETURNING id, username, email, role, status, "createdAt"
    `, [userId, username, email, hashedPassword, role, 'active', now, now]);

    const newUser = result.rows[0];

    return NextResponse.json({
      success: true,
      data: newUser,
      message: '管理员用户创建成功'
    });

  } catch (error) {
    console.error('Create admin error:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '创建管理员失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}