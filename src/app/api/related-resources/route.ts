import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getRelatedResources, addRelatedResource } from '@/lib/related-resources';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const audioId = searchParams.get('audioId');
    
    const resources = getRelatedResources();
    
    if (audioId) {
      const filteredResources = resources.filter(resource => resource.audioId === audioId);
      return NextResponse.json(filteredResources);
    }
    
    return NextResponse.json(resources);
  } catch (error) {
    console.error('Error fetching related resources:', error);
    return NextResponse.json(
      { error: 'Failed to fetch related resources' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
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
    const { audioId, title, url, type, description } = body;

    if (!audioId || !title || !url || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newResource = addRelatedResource({
      audioId,
      title,
      url,
      type,
      description,
      createdBy: session.user.id,
    });

    return NextResponse.json(newResource, { status: 201 });
  } catch (error) {
    console.error('Error creating related resource:', error);
    return NextResponse.json(
      { error: 'Failed to create related resource' },
      { status: 500 }
    );
  }
}