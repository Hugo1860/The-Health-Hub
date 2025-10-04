/**
 * 修复版管理员用户管理API
 * 使用统一认证中间件
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withMonitoring } from '@/lib/monitoring-middleware';
import { withSecurityAndValidation } from '@/lib/secureApiWrapper';
import { z } from 'zod';
import { ANTD_ADMIN_PERMISSIONS } from '@/lib/server-permissions';

// 获取用户列表
async function handleGet(request: NextRequest) {
  try {
    console.log(`用户管理API GET请求开始`);
    
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
      whereClause = 'WHERE username ILIKE ? OR email ILIKE ?';
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
    
    return NextResponse.json({ success: true, data: responseData, message: '获取用户列表成功' });
    
  } catch (error) {
    console.error(`获取用户列表失败:`, error);
    return NextResponse.json({ success: false, error: { message: `获取用户列表失败: ${error instanceof Error ? error.message : '未知错误'}` } }, { status: 500 });
  }
}

// 创建用户
async function handlePost(request: NextRequest) {
  try {
    console.log(`Create User API Called`);
    
    const requestBody = await request.json();
    console.log('Request body:', requestBody);
    
    const { username, email, password, role = 'user', status = 'active', name, phone } = requestBody;
    
    if (!email || !password) {
      console.log(`[${context.requestId}] Validation failed:`, { email: !!email, password: !!password });
      return NextResponse.json({ success: false, error: { code: 'VALIDATION_ERROR', message: '邮箱和密码不能为空' } }, { status: 400 });
    }
    
    console.log('Validation passed');
    
    const db = getDatabase();
    
    // 检查用户名和邮箱是否已存在
    console.log('Checking for existing user...');
    const existingResult = await db.query(
      'SELECT id FROM users WHERE email = ? OR (username = ? AND username IS NOT NULL)',
      [email, username || '']
    );
    
    if (existingResult.rows.length > 0) {
    console.log(`User already exists:`, existingResult.rows[0]);
    return NextResponse.json({ success: false, error: { code: 'USER_EXISTS', message: '用户名或邮箱已存在' } }, { status: 409 });
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
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
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
    
    console.log(`User created successfully`);
    return NextResponse.json({ success: true, data: { user: { ...newUser, id: newUser.id.toString() } }, message: '用户创建成功' });
    
  } catch (error) {
    console.error(`创建用户失败:`, error);
    return NextResponse.json({ success: false, error: { message: `创建用户失败: ${error instanceof Error ? error.message : '未知错误'}` } }, { status: 500 });
  }
}

// 导出处理函数，使用统一认证中间件和监控中间件包装
const getQuerySchema = z.object({ page: z.string().optional(), pageSize: z.string().optional(), query: z.string().optional() });
export const GET = withSecurityAndValidation(withMonitoring(handleGet, { operationName: 'admin-users-simple-get', trackPerformance: true }), getQuerySchema, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.VIEW_USERS], enableRateLimit: true });

const createBodySchema = z.object({ email: z.string().email(), password: z.string().min(6), username: z.string().optional(), role: z.string().optional(), status: z.string().optional() });
export const POST = withSecurityAndValidation(withMonitoring(handlePost, { operationName: 'admin-users-simple-post', trackPerformance: true }), createBodySchema, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.CREATE_USER], requireCSRF: true });