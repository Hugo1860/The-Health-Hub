import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateSlide, deleteSlide, getSlides } from '@/lib/slides';

export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 检查用户是否为管理员
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, imageUrl, startTime, endTime, description, order } = body;

    const updatedSlide = updateSlide(params.id, {
      title,
      imageUrl,
      startTime: startTime !== undefined ? parseFloat(startTime) : undefined,
      endTime: endTime !== undefined ? parseFloat(endTime) : undefined,
      description,
      order,
    });

    if (!updatedSlide) {
      return NextResponse.json(
        { error: 'Slide not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedSlide);
  } catch (error) {
    console.error('Error updating slide:', error);
    return NextResponse.json(
      { error: 'Failed to update slide' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // 检查用户是否为管理员
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const success = deleteSlide(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Slide not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Slide deleted successfully' });
  } catch (error) {
    console.error('Error deleting slide:', error);
    return NextResponse.json(
      { error: 'Failed to delete slide' },
      { status: 500 }
    );
  }
}