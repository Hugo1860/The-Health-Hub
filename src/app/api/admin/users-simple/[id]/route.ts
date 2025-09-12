/**
 * 简化版单个用户管理API
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

// 获取单个用户
async function handleGet(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // 检查管理员权限
    await checkAdminPermission(request);
    
    const { id: userId } = await context.params;
    
    // 获取用户信息
    const db = getDatabase();
    const userQuery = `
      SELECT 
        id,
        username,
        email,
        COALESCE(role, 'user') as role,
        COALESCE(status, 'active') as status,
        "createdAt",
        "lastLogin"
      FROM users 
      WHERE id = $1
    `;
    
    const result = await db.query(userQuery, [userId]);
    const user = result.rows[0];
    
    if (!user) {
      return NextResponse.json({
        success: false,
        error: { message: '用户不存在' }
      }, { status: 404 });
    }
    
    return NextResponse.json({
      success: true,
      data: {
        ...user,
        id: user.id.toString()
      }
    });
    
  } catch (error) {
    console.error('获取用户信息失败:', error);
    
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
      error: { message: '获取用户信息失败' }
    }, { status: 500 });
  }
}

// 更新用户
async function handlePut(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // 检查管理员权限
    await checkAdminPermission(request);
    
    const { id: userId } = await context.params;
    const updateData = await request.json();
    
    const db = getDatabase();
    
    // 检查用户是否存在
    const existingResult = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    const existingUser = existingResult.rows[0];
    
    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: { message: '用户不存在' }
      }, { status: 404 });
    }
    
    // 如果更新用户名或邮箱，检查是否与其他用户冲突
    if (updateData.username || updateData.email) {
      const conflictResult = await db.query(`
        SELECT id FROM users 
        WHERE id != $1 AND (username = $2 OR email = $3)
      `, [userId, updateData.username || '', updateData.email || '']);
      
      if (conflictResult.rows.length > 0) {
        return NextResponse.json({
          success: false,
          error: { message: '用户名或邮箱已被其他用户使用' }
        }, { status: 409 });
      }
    }
    
    // 构建更新字段
    const updateFields: string[] = [];
    const updateValues: any[] = [];
    let paramIndex = 1;
    
    if (updateData.username !== undefined) {
      updateFields.push(`username = $${paramIndex}`);
      updateValues.push(updateData.username);
      paramIndex++;
    }
    
    if (updateData.email !== undefined) {
      updateFields.push(`email = $${paramIndex}`);
      updateValues.push(updateData.email.toLowerCase());
      paramIndex++;
    }
    
    if (updateData.role !== undefined) {
      updateFields.push(`role = $${paramIndex}`);
      updateValues.push(updateData.role);
      paramIndex++;
    }
    
    if (updateData.status !== undefined) {
      updateFields.push(`status = $${paramIndex}`);
      updateValues.push(updateData.status);
      paramIndex++;
    }
    
    // 添加更新时间
    updateFields.push(`"updatedAt" = $${paramIndex}`);
    updateValues.push(new Date().toISOString());
    paramIndex++;
    
    if (updateFields.length === 1) { // 只有updatedAt
      return NextResponse.json({
        success: false,
        error: { message: '没有提供要更新的字段' }
      }, { status: 400 });
    }
    
    // 执行更新
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, username, email, role, status, "createdAt", "updatedAt"
    `;
    
    updateValues.push(userId);
    
    const result = await db.query(updateQuery, updateValues);
    
    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '更新失败' }
      }, { status: 500 });
    }
    
    const updatedUser = result.rows[0];
    
    return NextResponse.json({
      success: true,
      data: {
        ...updatedUser,
        id: updatedUser.id.toString()
      },
      message: '用户信息更新成功'
    });
    
  } catch (error) {
    console.error('更新用户失败:', error);
    
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
      error: { message: '更新用户失败' }
    }, { status: 500 });
  }
}

// 删除用户
async function handleDelete(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    // 检查管理员权限
    await checkAdminPermission(request);
    
    const { id: userId } = await context.params;
    
    const db = getDatabase();
    
    // 检查用户是否存在
    const existingResult = await db.query('SELECT id FROM users WHERE id = $1', [userId]);
    const existingUser = existingResult.rows[0];
    
    if (!existingUser) {
      return NextResponse.json({
        success: false,
        error: { message: '用户不存在' }
      }, { status: 404 });
    }
    
    // 先删除相关的外键数据（如果存在）
    try {
      await db.query('DELETE FROM comments WHERE "userId" = $1', [userId]);
      await db.query('DELETE FROM favorites WHERE "userId" = $1', [userId]);
      await db.query('DELETE FROM play_history WHERE "userId" = $1', [userId]);
    } catch (error) {
      console.log('删除相关数据时出现错误，继续删除用户:', error.message);
    }
    
    // 删除用户
    const result = await db.query('DELETE FROM users WHERE id = $1', [userId]);
    
    if (result.rowCount === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '删除失败' }
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      message: '用户删除成功'
    });
    
  } catch (error) {
    console.error('删除用户失败:', error);
    
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
      error: { message: '删除用户失败' }
    }, { status: 500 });
  }
}

// 导出处理函数，使用监控中间件包装
export const GET = withMonitoring(handleGet, {
  operationName: 'admin-users-simple-get-single',
  trackPerformance: true
});

export const PUT = withMonitoring(handlePut, {
  operationName: 'admin-users-simple-put',
  trackPerformance: true
});

export const DELETE = withMonitoring(handleDelete, {
  operationName: 'admin-users-simple-delete',
  trackPerformance: true
});