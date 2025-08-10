import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
// Markers functionality removed

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

    // Markers functionality has been removed
    return NextResponse.json(
      { error: '标记功能暂时不可用' },
      { status: 501 }
    );
  } catch (error) {
    console.error('Error deleting marker:', error);
    return NextResponse.json(
      { error: '删除标记失败' },
      { status: 500 }
    );
  }
}