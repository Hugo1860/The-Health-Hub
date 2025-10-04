// 单个用户管理 API

import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withSecurity } from '@/lib/secureApiWrapper';
import { ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth';
import logger from '@/lib/logger';

// GET - 获取单个用户详情
export const GET = withSecurity(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const db = getDatabase();
    const userId = params.id;

    const result = await db.query(
      `
      SELECT 
        id,
        email,
        username,
        role,
        status,
        createdAt,
        updatedAt,
        lastLoginAt
      FROM users 
      WHERE id = ?
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '用户不存在' }
      }, { status: 404 });
    }

    const user = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        username: user.username,
        role: user.role || 'user',
        status: user.status || 'active',
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
        lastLoginAt: user.lastLoginAt,
        profile: {
          name: user.username,
          avatar: null,
          phone: null,
        }
      }
    });

  } catch (error) {
    logger.error('获取用户详情失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取用户详情失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.VIEW_USERS], enableRateLimit: true });

// PUT - 更新用户信息
export const PUT = withSecurity(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const db = getDatabase();
    const userId = params.id;
    const body = await request.json();
    const { email, username, role, status, name, phone } = body;

    // 检查用户是否存在
    const existingUser = await db.query('SELECT id FROM users WHERE id = ?', [userId]);

    if (existingUser.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '用户不存在' }
      }, { status: 404 });
    }

    // 如果更新邮箱，检查是否与其他用户冲突
    if (email) {
      const emailConflict = await db.query('SELECT id FROM users WHERE email = ? AND id != ?', [email, userId]);

      if (emailConflict.rows.length > 0) {
        return NextResponse.json({
          success: false,
          error: { message: '该邮箱已被其他用户使用' }
        }, { status: 400 });
      }
    }

    // 构建更新查询
    const updateFields: string[] = [];
    const updateValues: any[] = [];

    if (email !== undefined) {
      updateFields.push('email = ?');
      updateValues.push(email);
    }

    if (username !== undefined) {
      updateFields.push('username = ?');
      updateValues.push(username);
    }

    if (role !== undefined) {
      updateFields.push('role = ?');
      updateValues.push(role);
    }

    if (status !== undefined) {
      updateFields.push('status = ?');
      updateValues.push(status);
    }

    // 总是更新 updatedAt
    updateFields.push('updatedAt = CURRENT_TIMESTAMP');

    if (updateFields.length === 1) { // 只有 updatedAt
      return NextResponse.json({
        success: false,
        error: { message: '没有需要更新的字段' }
      }, { status: 400 });
    }

    // 执行更新
    updateValues.push(userId); // WHERE 参数
    const updateQuery = `
      UPDATE users 
      SET ${updateFields.join(', ')}
      WHERE id = ?
    `;

    await db.query(updateQuery, updateValues);

    const r2 = await db.query('SELECT id, email, username, role, status, createdAt, updatedAt, lastLoginAt FROM users WHERE id = ?', [userId]);
    const updatedUser = r2.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        username: updatedUser.username,
        role: updatedUser.role,
        status: updatedUser.status,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
        lastLoginAt: updatedUser.lastLoginAt,
        profile: {
          name: name || updatedUser.username,
          phone: phone
        }
      },
      message: '用户更新成功'
    });

  } catch (error) {
    logger.error('更新用户失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '更新用户失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.UPDATE_USER], requireCSRF: true, enableRateLimit: true, allowedMethods: ['PUT'] });

// DELETE - 删除用户
export const DELETE = withSecurity(async (
  request: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const db = getDatabase();
    const userId = params.id;

    // 检查用户是否存在
    const existingUser = await db.query('SELECT id, email, role FROM users WHERE id = ?', [userId]);

    if (existingUser.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: { message: '用户不存在' }
      }, { status: 404 });
    }

    const user = existingUser.rows[0];

    // 防止删除管理员账户（可选的安全措施）
    if (user.role === 'admin') {
      return NextResponse.json({
        success: false,
        error: { message: '不能删除管理员账户' }
      }, { status: 403 });
    }

    // 删除用户
    await db.query('DELETE FROM users WHERE id = ?', [userId]);

    return NextResponse.json({
      success: true,
      message: '用户删除成功',
      data: {
        deletedUserId: userId,
        deletedUserEmail: user.email
      }
    });

  } catch (error) {
    logger.error('删除用户失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '删除用户失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, requiredPermissions: [ANTD_ADMIN_PERMISSIONS.DELETE_USER], requireCSRF: true, enableRateLimit: true, allowedMethods: ['DELETE'] });