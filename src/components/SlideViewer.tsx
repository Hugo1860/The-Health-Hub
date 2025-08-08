'use client';

import { useState, useEffect } from 'react';
import { Slide } from '@/lib/slides';
import Image from 'next/image';

interface SlideViewerProps {
  audioId: string;
  currentTime: number;
  onSlideClick?: (time: number) => void;
}

export default function SlideViewer({ audioId, currentTime, onSlideClick }: SlideViewerProps) {
  const [slides, setSlides] = useState<Slide[]>([]);
  const [currentSlide, setCurrentSlide] = useState<Slide | null>(null);
  const [loading, setLoading] = useState(true);
  const [showThumbnails, setShowThumbnails] = useState(false);

  useEffect(() => {
    fetchSlides();
  }, [audioId]);

  useEffect(() => {
    if (slides.length > 0) {
      updateCurrentSlide();
    }
  }, [currentTime, slides]);

  const fetchSlides = async () => {
    try {
      const response = await fetch(`/api/slides?audioId=${audioId}`);
      if (response.ok) {
        const data = await response.json();
        setSlides(data);
      }
    } catch (error) {
      console.error('Error fetching slides:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateCurrentSlide = () => {
    if (slides.length === 0) return;

    // 找到当前时间对应的幻灯片
    let activeSlide = null;
    for (let i = 0; i < slides.length; i++) {
      const slide = slides[i];
      const nextSlide = slides[i + 1];
      
      if (currentTime >= slide.startTime) {
        // 如果有结束时间，检查是否在范围内
        if (slide.endTime && currentTime > slide.endTime) {
          continue;
        }
        
        // 如果没有结束时间，检查是否在下一张幻灯片之前
        if (!slide.endTime && nextSlide && currentTime >= nextSlide.startTime) {
          continue;
        }
        
        activeSlide = slide;
        break;
      }
    }
    
    setCurrentSlide(activeSlide);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSlideClick = (slide: Slide) => {
    if (onSlideClick) {
      onSlideClick(slide.startTime);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">幻灯片</h3>
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (slides.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">幻灯片</h3>
        <div className="text-gray-500 text-center py-8">
          此音频暂无幻灯片
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">幻灯片</h3>
        <div className="flex gap-2">
          <button
            onClick={() => setShowThumbnails(!showThumbnails)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showThumbnails ? '隐藏缩略图' : '显示缩略图'}
          </button>
          <span className="text-sm text-gray-500">
            {slides.length} 张幻灯片
          </span>
        </div>
      </div>

      {/* 当前幻灯片显示 */}
      {currentSlide ? (
        <div className="mb-6">
          <div className="relative bg-gray-100 rounded-lg overflow-hidden">
            <Image
              src={currentSlide.imageUrl}
              alt={currentSlide.title}
              width={800}
              height={600}
              className="w-full h-auto max-h-96 object-contain"
              priority
            />
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 to-transparent p-4">
              <h4 className="text-white font-semibold text-lg mb-1">
                {currentSlide.title}
              </h4>
              {currentSlide.description && (
                <p className="text-white/90 text-sm mb-2">
                  {currentSlide.description}
                </p>
              )}
              <div className="text-white/80 text-xs">
                时间: {formatTime(currentSlide.startTime)}
                {currentSlide.endTime && ` - ${formatTime(currentSlide.endTime)}`}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6 bg-gray-100 rounded-lg p-8 text-center text-gray-500">
          当前时间段暂无幻灯片
        </div>
      )}

      {/* 幻灯片缩略图列表 */}
      {showThumbnails && (
        <div className="border-t pt-4">
          <h4 className="text-md font-medium mb-3">所有幻灯片</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {slides.map((slide, index) => (
              <div
                key={slide.id}
                className={`cursor-pointer rounded-lg overflow-hidden border-2 transition-all ${
                  currentSlide?.id === slide.id
                    ? 'border-blue-500 ring-2 ring-blue-200'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => handleSlideClick(slide)}
              >
                <div className="relative">
                  <Image
                    src={slide.imageUrl}
                    alt={slide.title}
                    width={200}
                    height={150}
                    className="w-full h-24 object-cover"
                  />
                  <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1 rounded">
                    {index + 1}
                  </div>
                </div>
                <div className="p-2">
                  <h5 className="text-xs font-medium text-gray-900 truncate">
                    {slide.title}
                  </h5>
                  <p className="text-xs text-gray-500">
                    {formatTime(slide.startTime)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 导航按钮 */}
      {slides.length > 1 && (
        <div className="flex justify-between items-center mt-4 pt-4 border-t">
          <button
            onClick={() => {
              const currentIndex = slides.findIndex(s => s.id === currentSlide?.id);
              const prevSlide = slides[currentIndex - 1];
              if (prevSlide) {
                handleSlideClick(prevSlide);
              }
            }}
            disabled={!currentSlide || slides.findIndex(s => s.id === currentSlide.id) === 0}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← 上一张
          </button>
          
          <span className="text-sm text-gray-500">
            {currentSlide ? slides.findIndex(s => s.id === currentSlide.id) + 1 : 0} / {slides.length}
          </span>
          
          <button
            onClick={() => {
              const currentIndex = slides.findIndex(s => s.id === currentSlide?.id);
              const nextSlide = slides[currentIndex + 1];
              if (nextSlide) {
                handleSlideClick(nextSlide);
              }
            }}
            disabled={!currentSlide || slides.findIndex(s => s.id === currentSlide.id) === slides.length - 1}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            下一张 →
          </button>
        </div>
      )}
    </div>
  );
}