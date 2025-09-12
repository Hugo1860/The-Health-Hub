/**
 * 简化版管理员用户管理API
 * 专门针对当前PostgreSQL数据库结构设计
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getDatabase } from '@/lib/database';
import { withMonitoring } from '@/lib/monitoring-middleware';

// 检查管理员权限
async function checkAdminPermission(request: NextRequest) {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    throw new Error('未登录');
  }
  
  // 检查用户是否为管理员
  const db = getDatabase();
  const result = await db.query('SELECT role FROM users WHERE email = $1', [session.user.email]);
  const user = result.rows[0];
  
  if (!user || user.role !== 'admin') {
    throw new Error('权限不足');
  }
  
  return user;
}

// 获取用户列表
async function handleGet(request: NextRequest) {
  try {
    console.log('=== 用户管理API GET请求开始 ===');
    
    // 检查管理员权限
    await checkAdminPermission(request);
    console.log('管理员权限验证通过');
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const query = searchParams.get('query') || '';
    
    const offset = (page - 1) * pageSize;
    
    const db = getDatabase();
    
    // 构建查询条件
    let whereClause = '';
    let queryParams: any[] = [];
    let paramIndex = 1;
    
    if (query) {
      whereClause = 'WHERE username ILIKE $1 OR email ILIKE $2';
      queryParams = [`%${query}%`, `%${query}%`];
      paramIndex = 3;
    }
    
    // 获取用户总数
    const countQuery = `SELECT COUNT(*) as total FROM users ${whereClause}`;
    console.log('执行计数查询:', countQuery, queryParams);
    const countResult = await db.query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0]?.total || '0');
    console.log('用户总数:', total);
    
    // 获取用户列表（不包含密码）
    const usersQuery = `
      SELECT 
        id,
        username,
        email,
        COALESCE(role, 'user') as role,
        COALESCE(status, 'active') as status,
        "createdAt",
        "lastLogin"
      FROM users 
      ${whereClause}
      ORDER BY "createdAt" DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    const usersParams = [...queryParams, pageSize, offset];
    console.log('执行用户查询:', usersQuery, usersParams);
    const usersResult = await db.query(usersQuery, usersParams);
    const users = usersResult.rows;
    console.log('获取到用户数量:', users.length);
    
    const responseData = {
      success: true,
      data: users.map(user => ({
        ...user,
        id: user.id.toString()
      })),
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize)
      }
    };
    
    console.log('返回响应数据:', responseData);
    return NextResponse.json(responseData);
    
  } catch (error) {
    console.error('获取用户列表失败:', error);
    
    if (error.message === '未登录') {
      return NextResponse.json({
        success: false,
        error: { message: '请先登录' }
      }, { status: 401 });
    }
    
    if (error.message === '权限不足') {
      return NextResponse.json({
        success: false,
        error: { message: '权限不足' }
      }, { status: 403 });
    }
    
    return NextResponse.json({
      success: false,
      error: { 
        message: '获取用户列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}

// 创建用户
async function handlePost(request: NextRequest) {
  try {
    console.log('=== Create User API Called ===');
    
    // 检查管理员权限
    await checkAdminPermission(request);
    console.log('Admin permission check passed');
    
    const requestBody = await request.json();
    console.log('Request body:', requestBody);
    
    const { username, email, password, role = 'user', status = 'active' } = requestBody;
    
    if (!username || !email || !password) {
      console.log('Validation failed:', { username: !!username, email: !!email, password: !!password });
      return NextResponse.json({
        success: false,
        error: { message: '用户名、邮箱和密码不能为空' }
      }, { status: 400 });
    }
    
    console.log('Validation passed');
    
    const db = getDatabase();
    
    // 检查用户名和邮箱是否已存在
    console.log('Checking for existing user...');
    const existingResult = await db.query(
      'SELECT id FROM users WHERE username = $1 OR email = $2',
      [username, email]
    );
    
    if (existingResult.rows.length > 0) {
      console.log('User already exists:', existingResult.rows[0]);
      return NextResponse.json({
        success: false,
        error: { message: '用户名或邮箱已存在' }
      }, { status: 409 });
    }
    
    console.log('No existing user found');
    
    // 创建新用户
    const userId = Date.now().toString();
    const now = new Date().toISOString();
    
    console.log('Creating user with ID:', userId);
    
    // 对密码进行哈希处理
    const bcrypt = require('bcryptjs');
    const hashedPassword = await bcrypt.hash(password, 12);
    
    const insertQuery = `
      INSERT INTO users (id, username, email, password, role, status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, email, role, status, "createdAt"
    `;
    
    console.log('Executing insert query...');
    const insertResult = await db.query(insertQuery, [
      userId, username, email, hashedPassword, role, status, now, now
    ]);
    console.log('Insert result:', insertResult.rows[0]);
    
    const newUser = insertResult.rows[0];
    
    console.log('User created successfully');
    return NextResponse.json({
      success: true,
      data: {
        ...newUser,
        id: newUser.id.toString()
      },
      message: '用户创建成功'
    });
    
  } catch (error) {
    console.error('创建用户失败:', error);
    
    if (error.message === '未登录') {
      return NextResponse.json({
        success: false,
        error: { message: '请先登录' }
      }, { status: 401 });
    }
    
    if (error.message === '权限不足') {
      return NextResponse.json({
        success: false,
        error: { message: '权限不足' }
      }, { status: 403 });
    }
    
    return NextResponse.json({
      success: false,
      error: { 
        message: '创建用户失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}

// 导出处理函数，使用监控中间件包装
export const GET = withMonitoring(handleGet, {
  operationName: 'admin-users-simple-get',
  trackPerformance: true
});

export const POST = withMonitoring(handlePost, {
  operationName: 'admin-users-simple-post',
  trackPerformance: true
});