import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getSlides, getSlidesByAudioId, addSlide } from '@/lib/slides';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const audioId = searchParams.get('audioId');
    const currentTime = searchParams.get('currentTime');
    
    if (audioId) {
      const slides = getSlidesByAudioId(audioId);
      
      // 如果提供了当前时间，返回当前时间对应的幻灯片
      if (currentTime) {
        const time = parseFloat(currentTime);
        const currentSlide = slides.find(slide => {
          const nextSlide = slides.find(s => s.order === slide.order + 1);
          return time >= slide.startTime && (!nextSlide || time < nextSlide.startTime);
        });
        
        return NextResponse.json({ 
          slides, 
          currentSlide: currentSlide || null 
        });
      }
      
      return NextResponse.json(slides);
    }
    
    const allSlides = getSlides();
    return NextResponse.json(allSlides);
  } catch (error) {
    console.error('Error fetching slides:', error);
    return NextResponse.json(
      { error: 'Failed to fetch slides' },
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

    // 检查用户是否为管理员
    if (session.user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { audioId, title, imageUrl, startTime, endTime, description, order } = body;

    if (!audioId || !title || !imageUrl || startTime === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const newSlide = addSlide({
      audioId,
      title,
      imageUrl,
      startTime: parseFloat(startTime),
      endTime: endTime ? parseFloat(endTime) : undefined,
      description,
      order: order || 0,
      createdBy: session.user.id,
    });

    return NextResponse.json(newSlide, { status: 201 });
  } catch (error) {
    console.error('Error creating slide:', error);
    return NextResponse.json(
      { error: 'Failed to create slide' },
      { status: 500 }
    );
  }
}