import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteMarker, readMarkers } from '@/lib/chapters';

// DELETE - 删除标记
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: '请先登录' },
        { status: 401 }
      );
    }

    // 检查标记是否存在以及权限
    const markers = readMarkers();
    const marker = markers.find(m => m.id === params.id);
    
    if (!marker) {
      return NextResponse.json(
        { error: '标记不存在' },
        { status: 404 }
      );
    }

    // 只有标记创建者或管理员可以删除
    if (marker.createdBy !== session.user.id && session.user.role !== 'admin') {
      return NextResponse.json(
        { error: '无权限删除此标记' },
        { status: 403 }
      );
    }

    const success = deleteMarker(params.id);
    
    if (!success) {
      return NextResponse.json(
        { error: '删除标记失败' },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: '标记已删除' });
  } catch (error) {
    console.error('Error deleting marker:', error);
    return NextResponse.json(
      { error: '删除标记失败' },
      { status: 500 }
    );
  }
}