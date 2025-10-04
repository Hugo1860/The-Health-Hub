'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Image, Skeleton } from 'antd';

interface LazyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  placeholder?: React.ReactNode;
  fallback?: React.ReactNode;
  style?: React.CSSProperties;
  rootMargin?: string;
  threshold?: number;
  onLoad?: () => void;
  onError?: () => void;
}

export default function LazyImage({
  src,
  alt,
  width = '100%',
  height = '100%',
  className,
  placeholder,
  fallback,
  style = {},
  rootMargin = '50px',
  threshold = 0.1,
  onLoad,
  onError
}: LazyImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);

  // Intersection Observer for lazy loading
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold]);

  // Load image when in view
  useEffect(() => {
    if (isInView && src && !imageSrc) {
      setImageSrc(src);
    }
  }, [isInView, src, imageSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    onLoad?.();
  };

  const handleError = () => {
    setHasError(true);
    onError?.();
  };

  const defaultPlaceholder = (
    <Skeleton.Image
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        ...style
      }}
      active
    />
  );

  const defaultFallback = (
    <div
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        backgroundColor: '#f0f0f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#999',
        fontSize: '14px',
        ...style
      }}
    >
      图片加载失败
    </div>
  );

  if (hasError) {
    return fallback || defaultFallback;
  }

  if (!isLoaded && !isInView) {
    return placeholder || defaultPlaceholder;
  }

  return (
    <Image
      ref={imgRef}
      src={imageSrc}
      alt={alt}
      width={width}
      height={height}
      className={className}
      style={style}
      preview={false}
      onLoad={handleLoad}
      onError={handleError}
      placeholder={
        <div style={{
          width: typeof width === 'number' ? `${width}px` : width,
          height: typeof height === 'number' ? `${height}px` : height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f5f5'
        }}>
          <Skeleton.Image active style={{ width: '100%', height: '100%' }} />
        </div>
      }
    />
  );
}
