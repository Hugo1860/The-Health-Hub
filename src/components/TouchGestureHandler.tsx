'use client'

import React, { useRef, useCallback, ReactNode } from 'react';

export interface TouchGestureHandlerProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onDoubleTap?: () => void;
  threshold?: number; // 滑动阈值
  className?: string;
  style?: React.CSSProperties;
}

interface TouchPoint {
  x: number;
  y: number;
  timestamp: number;
}

export const TouchGestureHandler: React.FC<TouchGestureHandlerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onPinch,
  onDoubleTap,
  threshold = 50,
  className,
  style
}) => {
  const touchStartRef = useRef<TouchPoint | null>(null);
  const lastTapRef = useRef<number>(0);
  const initialDistanceRef = useRef<number>(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    // 处理双指缩放
    if (e.touches.length === 2 && onPinch) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      initialDistanceRef.current = distance;
    }
  }, [onPinch]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // 处理双指缩放
    if (e.touches.length === 2 && onPinch && initialDistanceRef.current > 0) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const distance = Math.sqrt(
        Math.pow(touch2.clientX - touch1.clientX, 2) +
        Math.pow(touch2.clientY - touch1.clientY, 2)
      );
      const scale = distance / initialDistanceRef.current;
      onPinch(scale);
    }
  }, [onPinch]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.changedTouches[0];
    const touchEnd = {
      x: touch.clientX,
      y: touch.clientY,
      timestamp: Date.now()
    };

    const deltaX = touchEnd.x - touchStartRef.current.x;
    const deltaY = touchEnd.y - touchStartRef.current.y;
    const deltaTime = touchEnd.timestamp - touchStartRef.current.timestamp;

    // 检测双击
    if (onDoubleTap && deltaTime < 300 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
      const now = Date.now();
      if (now - lastTapRef.current < 300) {
        onDoubleTap();
        lastTapRef.current = 0; // 重置，避免三击触发两次双击
      } else {
        lastTapRef.current = now;
      }
    }

    // 检测滑动手势
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    if (Math.max(absDeltaX, absDeltaY) > threshold) {
      if (absDeltaX > absDeltaY) {
        // 水平滑动
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // 垂直滑动
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    touchStartRef.current = null;
    initialDistanceRef.current = 0;
  }, [onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onDoubleTap, threshold]);

  return (
    <div
      className={className}
      style={style}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
};

export default TouchGestureHandler;