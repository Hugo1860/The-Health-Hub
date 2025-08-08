'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';

export interface LazyLoadManagerProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
  delay?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  className?: string;
  style?: React.CSSProperties;
}

// 自定义 useInView Hook
function useInView(options: {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}) {
  const [inView, setInView] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    if (options.triggerOnce && hasTriggered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setInView(isIntersecting);
        
        if (isIntersecting && options.triggerOnce) {
          setHasTriggered(true);
        }
      },
      {
        threshold: options.threshold || 0,
        rootMargin: options.rootMargin || '0px'
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [options.threshold, options.rootMargin, options.triggerOnce, hasTriggered]);

  return { ref, inView };
}

// 基础懒加载组件
export const LazyLoadManager: React.FC<LazyLoadManagerProps> = ({
  children,
  fallback = <div className="animate-pulse bg-gray-200 rounded h-32" />,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
  delay = 0,
  onLoad,
  onError,
  className = '',
  style = {}
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce,
  });

  useEffect(() => {
    if (inView && !hasLoaded && !error) {
      if (delay > 0) {
        timeoutRef.current = setTimeout(() => {
          setIsVisible(true);
          setHasLoaded(true);
          onLoad?.();
        }, delay);
      } else {
        setIsVisible(true);
        setHasLoaded(true);
        onLoad?.();
      }
    }

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [inView, hasLoaded, error, delay, onLoad]);

  const handleError = useCallback((err: Error) => {
    setError(err);
    onError?.(err);
  }, [onError]);

  if (error) {
    return (
      <div 
        ref={ref} 
        className={`lazy-load-error ${className}`} 
        style={style}
      >
        <div className="flex flex-col items-center justify-center p-4 text-gray-500">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-sm">加载失败</p>
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} className={className} style={style}>
      {isVisible ? (
        <ErrorBoundary onError={handleError}>
          {children}
        </ErrorBoundary>
      ) : (
        fallback
      )}
    </div>
  );
};

// 错误边界组件
class ErrorBoundary extends React.Component<
  { children: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-4 text-gray-500">
          <div className="text-red-500 mb-2">⚠️</div>
          <p className="text-sm">组件渲染失败</p>
        </div>
      );
    }

    return this.props.children;
  }
}

// 图片懒加载组件
export interface LazyImageProps {
  src: string;
  alt: string;
  width?: number | string;
  height?: number | string;
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  threshold?: number;
  rootMargin?: string;
}

export const LazyImage: React.FC<LazyImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  style = {},
  placeholder,
  onLoad,
  onError,
  threshold = 0.1,
  rootMargin = '50px'
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView && !imageSrc && !hasError) {
      setImageSrc(src);
    }
  }, [inView, src, imageSrc, hasError]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
    onLoad?.();
  }, [onLoad]);

  const handleError = useCallback(() => {
    setHasError(true);
    onError?.(new Error(`Failed to load image: ${src}`));
  }, [src, onError]);

  const imageStyle = {
    width,
    height,
    ...style,
    opacity: isLoaded ? 1 : 0,
    transition: 'opacity 0.3s ease-in-out'
  };

  return (
    <div ref={ref} className={`relative ${className}`} style={{ width, height }}>
      {/* 占位符 */}
      {!isLoaded && !hasError && (
        <div 
          className="absolute inset-0 bg-gray-200 animate-pulse flex items-center justify-center"
          style={{ width, height }}
        >
          {placeholder ? (
            <img src={placeholder} alt="" className="opacity-50" />
          ) : (
            <div className="text-gray-400 text-xs">加载中...</div>
          )}
        </div>
      )}

      {/* 错误状态 */}
      {hasError && (
        <div 
          className="absolute inset-0 bg-gray-100 flex items-center justify-center"
          style={{ width, height }}
        >
          <div className="text-gray-400 text-xs text-center">
            <div className="mb-1">⚠️</div>
            <div>图片加载失败</div>
          </div>
        </div>
      )}

      {/* 实际图片 */}
      {imageSrc && !hasError && (
        <img
          ref={imgRef}
          src={imageSrc}
          alt={alt}
          style={imageStyle}
          onLoad={handleLoad}
          onError={handleError}
          className="absolute inset-0 w-full h-full object-cover"
        />
      )}
    </div>
  );
};

// 组件懒加载高阶组件
export function withLazyLoading<P extends object>(
  Component: React.ComponentType<P>,
  options: Partial<LazyLoadManagerProps> = {}
) {
  const LazyComponent: React.FC<P> = (props) => {
    return (
      <LazyLoadManager {...options}>
        <Component {...props} />
      </LazyLoadManager>
    );
  };

  LazyComponent.displayName = `LazyLoaded(${Component.displayName || Component.name})`;
  return LazyComponent;
}

// 代码分割懒加载组件
export interface LazyComponentProps {
  loader: () => Promise<{ default: React.ComponentType<any> }>;
  fallback?: React.ReactNode;
  onLoad?: () => void;
  onError?: (error: Error) => void;
  props?: any;
}

export const LazyComponent: React.FC<LazyComponentProps> = ({
  loader,
  fallback = <div className="animate-pulse bg-gray-200 rounded h-32" />,
  onLoad,
  onError,
  props = {}
}) => {
  const [Component, setComponent] = useState<React.ComponentType<any> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const { ref, inView } = useInView({
    threshold: 0.1,
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView && !Component && !loading && !error) {
      setLoading(true);
      
      loader()
        .then((module) => {
          setComponent(() => module.default);
          setLoading(false);
          onLoad?.();
        })
        .catch((err) => {
          setError(err);
          setLoading(false);
          onError?.(err);
        });
    }
  }, [inView, Component, loading, error, loader, onLoad, onError]);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-gray-500">
        <div className="text-red-500 mb-2">⚠️</div>
        <p className="text-sm">组件加载失败</p>
      </div>
    );
  }

  if (loading || !Component) {
    return <div ref={ref}>{fallback}</div>;
  }

  return <Component {...props} />;
};

// 批量懒加载管理器
export interface BatchLazyLoadManagerProps {
  children: React.ReactNode[];
  batchSize?: number;
  delay?: number;
  threshold?: number;
  rootMargin?: string;
  onBatchLoad?: (batchIndex: number) => void;
}

export const BatchLazyLoadManager: React.FC<BatchLazyLoadManagerProps> = ({
  children,
  batchSize = 5,
  delay = 100,
  threshold = 0.1,
  rootMargin = '100px',
  onBatchLoad
}) => {
  const [loadedBatches, setLoadedBatches] = useState<Set<number>>(new Set([0]));
  const timeoutRefs = useRef<Map<number, NodeJS.Timeout>>(new Map());

  const batches = useMemo(() => {
    const result: React.ReactNode[][] = [];
    for (let i = 0; i < children.length; i += batchSize) {
      result.push(children.slice(i, i + batchSize));
    }
    return result;
  }, [children, batchSize]);

  const loadBatch = useCallback((batchIndex: number) => {
    if (loadedBatches.has(batchIndex)) return;

    const timeoutId = setTimeout(() => {
      setLoadedBatches(prev => new Set([...prev, batchIndex]));
      onBatchLoad?.(batchIndex);
      timeoutRefs.current.delete(batchIndex);
    }, delay);

    timeoutRefs.current.set(batchIndex, timeoutId);
  }, [loadedBatches, delay, onBatchLoad]);

  useEffect(() => {
    return () => {
      timeoutRefs.current.forEach(timeout => clearTimeout(timeout));
      timeoutRefs.current.clear();
    };
  }, []);

  return (
    <div className="space-y-4">
      {batches.map((batch, batchIndex) => (
        <BatchTrigger
          key={batchIndex}
          batchIndex={batchIndex}
          isLoaded={loadedBatches.has(batchIndex)}
          onLoad={loadBatch}
          threshold={threshold}
          rootMargin={rootMargin}
        >
          {loadedBatches.has(batchIndex) ? (
            <div className="space-y-2">
              {batch.map((child, childIndex) => (
                <div key={`${batchIndex}-${childIndex}`}>
                  {child}
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {Array.from({ length: batch.length }).map((_, index) => (
                <div key={index} className="animate-pulse bg-gray-200 rounded h-20" />
              ))}
            </div>
          )}
        </BatchTrigger>
      ))}
    </div>
  );
};

// 批次触发器组件
const BatchTrigger: React.FC<{
  batchIndex: number;
  isLoaded: boolean;
  onLoad: (batchIndex: number) => void;
  threshold: number;
  rootMargin: string;
  children: React.ReactNode;
}> = ({ batchIndex, isLoaded, onLoad, threshold, rootMargin, children }) => {
  const { ref, inView } = useInView({
    threshold,
    rootMargin,
    triggerOnce: true,
  });

  useEffect(() => {
    if (inView && !isLoaded) {
      onLoad(batchIndex);
    }
  }, [inView, isLoaded, batchIndex, onLoad]);

  return <div ref={ref}>{children}</div>;
};

export default LazyLoadManager;