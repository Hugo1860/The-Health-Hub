// 用户管理 API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { authMiddleware } from '@/lib/auth-middleware';
import bcrypt from 'bcryptjs';

// 用户接口
interface User {
  id: string;
  email: string;
  username?: string;
  role: string;
  status: string;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  profile?: {
    name?: string;
    avatar?: string;
    phone?: string;
  };
}

// GET - 获取用户列表
export const GET = authMiddleware.admin(async (request: NextRequest) => {
  try {
    const db = getDatabase();
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page') || '1');
    const pageSize = parseInt(url.searchParams.get('pageSize') || '10');
    const search = url.searchParams.get('search') || '';
    const role = url.searchParams.get('role') || '';
    const status = url.searchParams.get('status') || '';

    let whereClause = 'WHERE 1=1';
    const params: any[] = [];
    let paramIndex = 1;

    // 搜索条件
    if (search) {
      whereClause += ` AND (email ILIKE $${paramIndex} OR username ILIKE $${paramIndex + 1})`;
      params.push(`%${search}%`, `%${search}%`);
      paramIndex += 2;
    }

    // 角色筛选
    if (role) {
      whereClause += ` AND role = $${paramIndex}`;
      params.push(role);
      paramIndex++;
    }

    // 状态筛选
    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    // 获取用户列表
    const offset = (page - 1) * pageSize;
    const usersQuery = `
      SELECT 
        id,
        email,
        username,
        role,
        status,
        "createdAt",
        "updatedAt",
        "lastLoginAt"
      FROM users 
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const usersResult = await db.query(usersQuery, [...params, pageSize, offset]);
    
    // 获取总数
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    const countResult = await db.query(countQuery, params);
    const total = parseInt(countResult.rows[0]?.total || '0');

    // 格式化用户数据
    const users: User[] = usersResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      username: row.username,
      role: row.role || 'user',
      status: row.status || 'active',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      lastLoginAt: row.lastLoginAt,
      profile: {
        name: row.username, // 暂时使用username作为name
        avatar: null,
        phone: null,
      }
    }));

    return NextResponse.json({
      success: true,
      data: users,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    });

  } catch (error) {
    console.error('获取用户列表失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取用户列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
});

// POST - 创建新用户
export const POST = authMiddleware.admin(async (request: NextRequest) => {
  try {
    const db = getDatabase();
    const body = await request.json();
    const { email, username, password, role = 'user', status = 'active', name, phone } = body;

    // 验证必填字段
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: { message: '邮箱和密码是必填字段' }
      }, { status: 400 });
    }

    // 检查邮箱是否已存在
    const existingUser = await db.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: { message: '该邮箱已被注册' }
      }, { status: 400 });
    }

    // 加密密码
    const hashedPassword = await bcrypt.hash(password, 12);

    // 创建用户
    const result = await db.query(`
      INSERT INTO users (email, username, password, role, status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
      RETURNING id, email, username, role, status, "createdAt", "updatedAt"
    `, [email, username, hashedPassword, role, status]);

    const newUser = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        username: newUser.username,
        role: newUser.role,
        status: newUser.status,
        createdAt: newUser.createdAt,
        updatedAt: newUser.updatedAt,
        profile: {
          name: name || username,
          phone: phone
        }
      },
      message: '用户创建成功'
    });

  } catch (error) {
    console.error('创建用户失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '创建用户失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
});