/**
 * 测试删除用户API
 * 用于调试用户删除功能
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import db from '@/lib/db';

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    console.log('Delete user API called');
    
    // 获取参数
    const { id: userId } = await context.params;
    console.log('User ID to delete:', userId);
    
    // 检查会话
    const session = await getServerSession(authOptions);
    console.log('Session:', session?.user?.email);
    
    if (!session?.user?.email) {
      console.log('No session found');
      return NextResponse.json({
        success: false,
        error: { message: '请先登录' }
      }, { status: 401 });
    }
    
    // 检查管理员权限
    const userQuery = db.prepare('SELECT role FROM users WHERE email = ?');
    const user = userQuery.get(session.user.email) as { role?: string } | undefined;
    console.log('Current user role:', user?.role);
    
    if (!user || user.role !== 'admin') {
      console.log('Permission denied');
      return NextResponse.json({
        success: false,
        error: { message: '权限不足' }
      }, { status: 403 });
    }
    
    // 检查要删除的用户是否存在
    const targetUser = db.prepare('SELECT * FROM users WHERE id = ?').get(userId);
    console.log('Target user:', targetUser);
    
    if (!targetUser) {
      console.log('Target user not found');
      return NextResponse.json({
        success: false,
        error: { message: '用户不存在' }
      }, { status: 404 });
    }
    
    // 执行删除
    console.log('Attempting to delete user...');
    const result = db.prepare('DELETE FROM users WHERE id = ?').run(userId);
    console.log('Delete result:', result);
    
    if (result.changes === 0) {
      console.log('No rows affected');
      return NextResponse.json({
        success: false,
        error: { message: '删除失败，没有行被影响' }
      }, { status: 500 });
    }
    
    console.log('User deleted successfully');
    return NextResponse.json({
      success: true,
      message: '用户删除成功',
      deletedUserId: userId,
      changes: result.changes
    });
    
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({
      success: false,
      error: { 
        message: '删除用户失败',
        details: error.message,
        stack: error.stack
      }
    }, { status: 500 });
  }
}