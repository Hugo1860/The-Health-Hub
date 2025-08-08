import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { updateRelatedResource, deleteRelatedResource, getRelatedResources } from '@/lib/related-resources';

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

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { title, url, type, description } = body;

    const updatedResource = updateRelatedResource(params.id, {
      title,
      url,
      type,
      description,
    });

    if (!updatedResource) {
      return NextResponse.json(
        { error: 'Related resource not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(updatedResource);
  } catch (error) {
    console.error('Error updating related resource:', error);
    return NextResponse.json(
      { error: 'Failed to update related resource' },
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

    // Check if user is admin
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const success = deleteRelatedResource(params.id);

    if (!success) {
      return NextResponse.json(
        { error: 'Related resource not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: 'Related resource deleted successfully' });
  } catch (error) {
    console.error('Error deleting related resource:', error);
    return NextResponse.json(
      { error: 'Failed to delete related resource' },
      { status: 500 }
    );
  }
}