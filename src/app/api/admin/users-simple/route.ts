/**
 * 修复版管理员用户管理API
 * 使用统一认证中间件
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withMonitoring } from '@/lib/monitoring-middleware';
import { withAdminAuth, UnifiedResponseBuilder, AuthContext } from '@/lib/unified-auth-middleware';

// 获取用户列表
async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    console.log(`[${context.requestId}] 用户管理API GET请求开始`);
    console.log(`[${context.requestId}] 管理员权限验证通过:`, context.user?.email);
    
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const pageSize = parseInt(searchParams.get('pageSize') || '20');
    const query = searchParams.get('query') || '';
    
    const offset = (page - 1) * pageSize;
    
    const db = getDatabase();
    
    // 构建查询条件
    let whereClause = '';
    let queryParams: any[] = [];
    
    if (query) {
      whereClause = 'WHERE username ILIKE $1 OR email ILIKE $2';
      queryParams = [`%${query}%`, `%${query}%`];
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
        created_at,
        last_login,
        created_at as "updatedAt"
      FROM users 
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
    `;
    
    const usersParams = [...queryParams, pageSize, offset];
    console.log('执行用户查询:', usersQuery, usersParams);
    const usersResult = await db.query(usersQuery, usersParams);
    const users = usersResult.rows;
    console.log('获取到用户数量:', users.length);
    
    const responseData = {
      users: users.map(user => ({
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
    
    console.log(`[${context.requestId}] 返回响应数据:`, responseData);
    return UnifiedResponseBuilder.success(responseData, '获取用户列表成功');
    
  } catch (error) {
    console.error(`[${context.requestId}] 获取用户列表失败:`, error);
    return UnifiedResponseBuilder.serverError(
      `获取用户列表失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

// 创建用户
async function handlePost(request: NextRequest, context: AuthContext) {
  try {
    console.log(`[${context.requestId}] Create User API Called`);
    console.log(`[${context.requestId}] Admin permission check passed:`, context.user?.email);
    
    const requestBody = await request.json();
    console.log('Request body:', requestBody);
    
    const { username, email, password, role = 'user', status = 'active', name, phone } = requestBody;
    
    if (!email || !password) {
      console.log(`[${context.requestId}] Validation failed:`, { email: !!email, password: !!password });
      return UnifiedResponseBuilder.error('邮箱和密码不能为空', 'VALIDATION_ERROR', 400);
    }
    
    console.log('Validation passed');
    
    const db = getDatabase();
    
    // 检查用户名和邮箱是否已存在
    console.log('Checking for existing user...');
    const existingResult = await db.query(
      'SELECT id FROM users WHERE email = $1 OR (username = $2 AND username IS NOT NULL)',
      [email, username || '']
    );
    
    if (existingResult.rows.length > 0) {
      console.log(`[${context.requestId}] User already exists:`, existingResult.rows[0]);
      return UnifiedResponseBuilder.error('用户名或邮箱已存在', 'USER_EXISTS', 409);
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
      INSERT INTO users (id, username, email, password, role, status, created_at, last_login)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING id, username, email, role, status, created_at
    `;
    
    console.log('Executing insert query...');
    const insertResult = await db.query(insertQuery, [
      userId, 
      username || email.split('@')[0], // 如果没有用户名，使用邮箱前缀
      email, 
      hashedPassword, 
      role, 
      status, 
      now, 
      now
    ]);
    console.log('Insert result:', insertResult.rows[0]);
    
    const newUser = insertResult.rows[0];
    
    console.log(`[${context.requestId}] User created successfully`);
    return UnifiedResponseBuilder.success({
      user: {
        ...newUser,
        id: newUser.id.toString()
      }
    }, '用户创建成功');
    
  } catch (error) {
    console.error(`[${context.requestId}] 创建用户失败:`, error);
    return UnifiedResponseBuilder.serverError(
      `创建用户失败: ${error instanceof Error ? error.message : '未知错误'}`
    );
  }
}

// 导出处理函数，使用统一认证中间件和监控中间件包装
export const GET = withAdminAuth(
  withMonitoring(handleGet, {
    operationName: 'admin-users-simple-get',
    trackPerformance: true
  })
);

export const POST = withAdminAuth(
  withMonitoring(handlePost, {
    operationName: 'admin-users-simple-post',
    trackPerformance: true
  })
);