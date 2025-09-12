'use client';

import { useState, useEffect, useRef, ReactNode } from 'react';

interface LazyLoadProps {
  children: ReactNode;
  height?: number;
  offset?: number;
  placeholder?: ReactNode;
  className?: string;
}

export default function LazyLoad({ 
  children, 
  height = 200, 
  offset = 100, 
  placeholder,
  className = ''
}: LazyLoadProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          setHasLoaded(true);
          // 一旦加载就不再观察
          if (elementRef.current) {
            observer.unobserve(elementRef.current);
          }
        }
      },
      {
        rootMargin: `${offset}px`,
        threshold: 0.1,
      }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      if (elementRef.current) {
        observer.unobserve(elementRef.current);
      }
    };
  }, [offset]);

  const defaultPlaceholder = (
    <div 
      className={`flex items-center justify-center bg-gray-100 rounded-lg ${className}`}
      style={{ height: `${height}px` }}
    >
      <div className="animate-pulse flex space-x-4 w-full p-4">
        <div className="rounded-full bg-gray-300 h-10 w-10"></div>
        <div className="flex-1 space-y-2">
          <div className="h-4 bg-gray-300 rounded w-3/4"></div>
          <div className="h-4 bg-gray-300 rounded w-1/2"></div>
        </div>
      </div>
    </div>
  );

  return (
    <div ref={elementRef} className={className}>
      {hasLoaded ? children : (placeholder || defaultPlaceholder)}
    </div>
  );
}

// 高阶组件版本的懒加载
export function withLazyLoad<P extends object>(
  Component: React.ComponentType<P>,
  options: {
    height?: number;
    offset?: number;
    placeholder?: ReactNode;
  } = {}
) {
  return function LazyLoadedComponent(props: P) {
    return (
      <LazyLoad {...options}>
        <Component {...props} />
      </LazyLoad>
    );
  };
}