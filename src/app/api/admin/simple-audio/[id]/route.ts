import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// 获取单个音频信息
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('=== Simple Admin Get Audio API Called ===');
  
  try {
    const { id } = params;
    console.log('Getting audio with ID:', id);
    
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'No authentication found'
      }, { status: 401 });
    }
    
    const user = session.user as any;
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin role required'
      }, { status: 403 });
    }
    
    // 查询音频
    const stmt = db.prepare('SELECT * FROM audios WHERE id = ?');
    const audio = stmt.get(id) as any;
    
    if (!audio) {
      return NextResponse.json({
        success: false,
        error: 'Audio not found'
      }, { status: 404 });
    }
    
    // 处理tags字段
    if (audio.tags && typeof audio.tags === 'string') {
      try {
        audio.tags = JSON.parse(audio.tags);
      } catch (e) {
        console.error('Failed to parse tags:', audio.tags);
        audio.tags = [];
      }
    }
    
    console.log('Audio found:', audio.title);
    return NextResponse.json({
      success: true,
      ...audio
    });
    
  } catch (error) {
    console.error('Get audio API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 更新音频信息
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('=== Simple Admin Update Audio API Called ===');
  
  try {
    const { id } = params;
    console.log('Updating audio with ID:', id);
    
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'No authentication found'
      }, { status: 401 });
    }
    
    const user = session.user as any;
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin role required'
      }, { status: 403 });
    }
    
    // 获取请求数据
    const body = await request.json();
    console.log('Update data:', body);
    
    const { title, description, subject, tags, speaker, recordingDate, transcription } = body;
    
    // 检查音频是否存在
    const checkStmt = db.prepare('SELECT id FROM audios WHERE id = ?');
    const existing = checkStmt.get(id);
    if (!existing) {
      return NextResponse.json({
        success: false,
        error: 'Audio not found'
      }, { status: 404 });
    }
    
    // 处理tags
    const tagsString = Array.isArray(tags) ? JSON.stringify(tags) : '[]';
    
    // 更新音频信息
    const stmt = db.prepare(`
      UPDATE audios
      SET title = ?, description = ?, subject = ?, tags = ?, speaker = ?, recordingDate = ?
      WHERE id = ?
    `);
    
    const info = stmt.run(
      title || '',
      description || '',
      subject || '',
      tagsString,
      speaker || '',
      recordingDate || null,
      id
    );
    
    if (info.changes === 0) {
      return NextResponse.json({
        success: false,
        error: 'No changes made'
      }, { status: 400 });
    }
    
    // 获取更新后的数据
    const getUpdatedStmt = db.prepare('SELECT * FROM audios WHERE id = ?');
    const updatedAudio = getUpdatedStmt.get(id) as any;
    
    // 处理返回数据中的tags
    if (updatedAudio && updatedAudio.tags && typeof updatedAudio.tags === 'string') {
      try {
        updatedAudio.tags = JSON.parse(updatedAudio.tags);
      } catch (e) {
        updatedAudio.tags = [];
      }
    }
    
    console.log('Audio updated successfully');
    return NextResponse.json({
      success: true,
      message: 'Audio updated successfully',
      audio: updatedAudio
    });
    
  } catch (error) {
    console.error('Update audio API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// 删除音频
export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  console.log('=== Simple Admin Delete Audio API Called ===');
  
  try {
    const { id } = params;
    console.log('Deleting audio with ID:', id);
    
    // 检查管理员权限
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({
        success: false,
        error: 'No authentication found'
      }, { status: 401 });
    }
    
    const user = session.user as any;
    const isAdmin = user.role === 'admin';
    
    if (!isAdmin) {
      return NextResponse.json({
        success: false,
        error: 'Admin role required'
      }, { status: 403 });
    }
    
    // 获取音频信息（用于删除文件）
    const getStmt = db.prepare('SELECT url FROM audios WHERE id = ?');
    const audio = getStmt.get(id) as any;
    
    if (!audio) {
      return NextResponse.json({
        success: false,
        error: 'Audio not found'
      }, { status: 404 });
    }
    
    // 删除数据库记录
    const deleteStmt = db.prepare('DELETE FROM audios WHERE id = ?');
    const info = deleteStmt.run(id);
    
    if (info.changes === 0) {
      return NextResponse.json({
        success: false,
        error: 'Audio not found'
      }, { status: 404 });
    }
    
    // 尝试删除文件（可选，不影响主要功能）
    try {
      const { unlink } = await import('fs/promises');
      const { join } = await import('path');
      const filePath = join(process.cwd(), 'public', audio.url);
      await unlink(filePath);
      console.log('File deleted:', filePath);
    } catch (fileError) {
      console.warn('Failed to delete file:', fileError);
      // 不返回错误，因为数据库记录已经删除
    }
    
    console.log('Audio deleted successfully');
    return NextResponse.json({
      success: true,
      message: 'Audio deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete audio API error:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}