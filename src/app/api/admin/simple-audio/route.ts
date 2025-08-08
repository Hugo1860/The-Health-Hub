import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  console.log('=== Simple Admin Audio API Called ===');
  
  try {
    // 1. 获取会话
    console.log('1. Getting session...');
    const session = await getServerSession(authOptions);
    console.log('Session result:', session ? 'Found' : 'Not found');
    
    if (session) {
      console.log('Session details:', {
        user: session.user,
        expires: session.expires
      });
    }
    
    // 2. 检查是否有用户
    if (!session?.user) {
      console.log('2. No user in session');
      return NextResponse.json({
        success: false,
        error: 'No authentication found'
      }, { status: 401 });
    }
    
    // 3. 检查用户角色
    const user = session.user as any;
    console.log('3. User details:', {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    });
    
    const isAdmin = user.role === 'admin';
    console.log('4. Admin check:', { role: user.role, isAdmin });
    
    if (!isAdmin) {
      console.log('5. User is not admin');
      return NextResponse.json({
        success: false,
        error: 'Admin role required'
      }, { status: 403 });
    }
    
    // 5. 查询数据库
    console.log('6. Querying database...');
    const audios = db.prepare('SELECT * FROM audios ORDER BY uploadDate DESC LIMIT 10').all();
    console.log('7. Query result:', audios.length, 'records found');
    
    // 6. 处理数据
    const processedAudios = audios.map(audio => ({
      ...audio,
      tags: typeof audio.tags === 'string' ? JSON.parse(audio.tags || '[]') : (audio.tags || [])
    }));
    
    console.log('8. Returning success response');
    return NextResponse.json({
      success: true,
      data: processedAudios,
      count: processedAudios.length
    });
    
  } catch (error) {
    console.error('=== API Error ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 创建新音频记录
export async function POST(request: NextRequest) {
  console.log('=== Simple Admin Create Audio API Called ===');
  
  try {
    // 1. 获取会话
    console.log('1. Getting session...');
    const session = await getServerSession(authOptions);
    console.log('Session result:', session ? 'Found' : 'Not found');
    
    if (!session?.user) {
      console.log('2. No user in session');
      return NextResponse.json({
        success: false,
        error: 'No authentication found'
      }, { status: 401 });
    }
    
    // 2. 检查用户角色
    const user = session.user as any;
    console.log('3. User details:', {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status
    });
    
    const isAdmin = user.role === 'admin';
    console.log('4. Admin check:', { role: user.role, isAdmin });
    
    if (!isAdmin) {
      console.log('5. User is not admin');
      return NextResponse.json({
        success: false,
        error: 'Admin role required'
      }, { status: 403 });
    }
    
    // 3. 获取请求数据
    const body = await request.json();
    console.log('6. Request body:', body);
    
    const { 
      title, 
      description, 
      filename, 
      url, 
      subject, 
      tags, 
      speaker, 
      recordingDate,
      size,
      duration,
      coverImage
    } = body;
    
    // 4. 验证必填字段
    if (!title || !filename || !url || !subject) {
      return NextResponse.json({
        success: false,
        error: 'Title, filename, url, and subject are required'
      }, { status: 400 });
    }
    
    // 5. 生成ID和时间戳
    const audioId = Date.now().toString();
    const uploadDate = new Date().toISOString();
    
    // 6. 处理tags
    const tagsString = Array.isArray(tags) ? JSON.stringify(tags) : JSON.stringify([]);
    
    // 7. 插入数据库
    console.log('7. Inserting into database...');
    const stmt = db.prepare(`
      INSERT INTO audios (
        id, title, description, filename, url, coverImage,
        uploadDate, subject, tags, size, duration, speaker, recordingDate
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const info = stmt.run(
      audioId,
      title,
      description || '',
      filename,
      url,
      coverImage || null,
      uploadDate,
      subject,
      tagsString,
      size || 0,
      duration || 0,
      speaker || '',
      recordingDate || uploadDate
    );
    
    if (info.changes === 0) {
      return NextResponse.json({
        success: false,
        error: 'Failed to create audio record'
      }, { status: 500 });
    }
    
    // 8. 获取创建的记录
    const getStmt = db.prepare('SELECT * FROM audios WHERE id = ?');
    const createdAudio = getStmt.get(audioId) as any;
    
    // 9. 处理返回数据中的tags
    if (createdAudio && createdAudio.tags && typeof createdAudio.tags === 'string') {
      try {
        createdAudio.tags = JSON.parse(createdAudio.tags);
      } catch (e) {
        createdAudio.tags = [];
      }
    }
    
    console.log('8. Audio created successfully:', createdAudio.title);
    return NextResponse.json({
      success: true,
      message: 'Audio created successfully',
      audio: createdAudio
    });
    
  } catch (error) {
    console.error('=== Create Audio API Error ===');
    console.error('Error:', error);
    console.error('Stack:', error instanceof Error ? error.stack : 'No stack');
    
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}