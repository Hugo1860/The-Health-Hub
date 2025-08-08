import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 管理员专用的音频列表API
export async function GET(request: NextRequest) {
  try {
    console.log('Admin audio API called');
    
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    console.log('Session:', session);
    
    if (!session?.user) {
      console.log('No session found');
      return NextResponse.json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: '需要登录才能访问'
        }
      }, { status: 401 });
    }
    
    const user = session.user as any;
    console.log('User:', user);
    
    const isAdmin = user?.role && ['admin', 'moderator', 'editor'].includes(user.role);
    console.log('Is admin:', isAdmin, 'Role:', user?.role);
    
    if (!isAdmin) {
      console.log('User is not admin');
      return NextResponse.json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: '需要管理员权限'
        }
      }, { status: 403 });
    }
    
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    
    const offset = (page - 1) * limit;
    
    // 构建查询
    let baseQuery = 'SELECT * FROM audios';
    let countQuery = 'SELECT COUNT(*) as total FROM audios';
    const whereClauses = [];
    const params: any[] = [];
    const countParams: any[] = [];
    
    if (category) {
      whereClauses.push('subject = ?');
      params.push(category);
      countParams.push(category);
    }
    
    if (search) {
      whereClauses.push('(title LIKE ? OR description LIKE ? OR speaker LIKE ?)');
      const searchTerm = `%${search}%`;
      params.push(searchTerm, searchTerm, searchTerm);
      countParams.push(searchTerm, searchTerm, searchTerm);
    }
    
    if (whereClauses.length > 0) {
      const whereString = ` WHERE ${whereClauses.join(' AND ')}`;
      baseQuery += whereString;
      countQuery += whereString;
    }
    
    // 添加排序和分页
    baseQuery += ' ORDER BY uploadDate DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);
    
    console.log('Executing query:', baseQuery, 'with params:', params);
    
    // 执行查询
    const getAudiosStmt = db.prepare(baseQuery);
    const getTotalStmt = db.prepare(countQuery);
    
    const audios = getAudiosStmt.all(params);
    const { total: totalItems } = getTotalStmt.get(countParams) as { total: number };
    
    console.log(`Found ${audios.length} audios, total: ${totalItems}`);
    
    // 处理数据
    const processedAudios = audios.map((audio: any) => ({
      ...audio,
      tags: typeof audio.tags === 'string' ? JSON.parse(audio.tags || '[]') : (audio.tags || []),
      uploadDate: audio.uploadDate || new Date().toISOString(),
      subject: audio.subject || '未分类',
      speaker: audio.speaker || '',
      duration: audio.duration || 0
    }));
    
    const totalPages = Math.ceil(totalItems / limit);
    
    return NextResponse.json({
      success: true,
      data: processedAudios,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    });
    
  } catch (error) {
    console.error('Admin audio API error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '获取音频列表失败',
        details: error instanceof Error ? error.message : 'Unknown error'
      }
    }, { status: 500 });
  }
}