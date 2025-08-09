'use client';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

export interface VirtualScrollListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
  loadMore?: () => Promise<void>;
  loading?: boolean;
  hasMore?: boolean;
  className?: string;
  style?: React.CSSProperties;
  onItemClick?: (item: T, index: number) => void;
  keyExtractor?: (item: T, index: number) => string | number;
}

interface VirtualizationResult {
  visibleItems: Array<{
    index: number;
    offsetY: number;
  }>;
  totalHeight: number;
  startIndex: number;
  endIndex: number;
}

function useVirtualization(
  itemCount: number,
  itemHeight: number,
  containerHeight: number,
  scrollTop: number,
  overscan: number = 5
): VirtualizationResult {
  return useMemo(() => {
    if (itemCount === 0) {
      return {
        visibleItems: [],
        totalHeight: 0,
        startIndex: 0,
        endIndex: 0
      };
    }

    const totalHeight = itemCount * itemHeight;
    const visibleItemCount = Math.ceil(containerHeight / itemHeight);
    
    // 计算可见范围
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      itemCount - 1,
      startIndex + visibleItemCount + overscan * 2
    );

    // 生成可见项目
    const visibleItems = [];
    for (let i = startIndex; i <= endIndex; i++) {
      visibleItems.push({
        index: i,
        offsetY: i * itemHeight
      });
    }

    return {
      visibleItems,
      totalHeight,
      startIndex,
      endIndex
    };
  }, [itemCount, itemHeight, containerHeight, scrollTop, overscan]);
}

// 自定义 useInView Hook
function useInView(options: {
  threshold?: number;
  rootMargin?: string;
}) {
  const [inView, setInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
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
  }, [options.threshold, options.rootMargin]);

  return { ref, inView };
}

export function VirtualScrollList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onScroll,
  loadMore,
  loading = false,
  hasMore = false,
  className = '',
  style = {},
  onItemClick,
  keyExtractor = (item, index) => index
}: VirtualScrollListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastScrollTop = useRef(0);
  const scrollDirection = useRef<'up' | 'down'>('down');

  // 虚拟化计算
  const { visibleItems, totalHeight, startIndex, endIndex } = useVirtualization(
    items.length,
    itemHeight,
    containerHeight,
    scrollTop,
    overscan
  );

  // 无限滚动检测
  const { ref: loadMoreRef, inView } = useInView({
    threshold: 0,
    rootMargin: '100px',
  });

  // 处理滚动事件
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    
    // 更新滚动方向
    scrollDirection.current = newScrollTop > lastScrollTop.current ? 'down' : 'up';
    lastScrollTop.current = newScrollTop;
    
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    onScroll?.(newScrollTop);

    // 清除之前的定时器
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // 设置滚动结束检测
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);
  }, [onScroll]);

  // 处理无限滚动
  useEffect(() => {
    if (inView && hasMore && !loading && loadMore) {
      loadMore();
    }
  }, [inView, hasMore, loading, loadMore]);

  // 滚动到指定位置
  const scrollToIndex = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      const targetScrollTop = index * itemHeight;
      containerRef.current.scrollTo({
        top: targetScrollTop,
        behavior
      });
    }
  }, [itemHeight]);

  // 滚动到顶部
  const scrollToTop = useCallback((behavior: ScrollBehavior = 'smooth') => {
    scrollToIndex(0, behavior);
  }, [scrollToIndex]);

  // 滚动到底部
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
    if (containerRef.current) {
      containerRef.current.scrollTo({
        top: totalHeight,
        behavior
      });
    }
  }, [totalHeight]);

  // 获取当前可见项目信息
  const getVisibleRange = useCallback(() => {
    return {
      startIndex,
      endIndex,
      visibleCount: endIndex - startIndex + 1,
      totalCount: items.length
    };
  }, [startIndex, endIndex, items.length]);

  // 清理定时器
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  // 处理项目点击
  const handleItemClick = useCallback((item: T, index: number) => {
    onItemClick?.(item, index);
  }, [onItemClick]);

  // 渲染加载指示器
  const renderLoadingIndicator = () => {
    if (!loading) return null;
    
    return (
      <div 
        style={{
          position: 'absolute',
          top: totalHeight,
          left: 0,
          right: 0,
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(4px)'
        }}
      >
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          <span className="text-sm text-gray-600">加载中...</span>
        </div>
      </div>
    );
  };

  // 渲染滚动指示器
  const renderScrollIndicator = () => {
    if (!isScrolling || items.length === 0) return null;
    
    const progress = Math.min(100, (scrollTop / (totalHeight - containerHeight)) * 100);
    
    return (
      <div 
        style={{
          position: 'absolute',
          right: 4,
          top: 4,
          bottom: 4,
          width: 4,
          background: 'rgba(0, 0, 0, 0.1)',
          borderRadius: 2,
          zIndex: 10
        }}
      >
        <div 
          style={{
            width: '100%',
            height: `${Math.max(10, (containerHeight / totalHeight) * 100)}%`,
            background: 'rgba(59, 130, 246, 0.8)',
            borderRadius: 2,
            transform: `translateY(${progress}%)`,
            transition: 'transform 0.1s ease-out'
          }}
        />
      </div>
    );
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-auto ${className}`}
      style={{ 
        height: containerHeight, 
        ...style 
      }}
      onScroll={handleScroll}
    >
      <div 
        style={{ 
          height: totalHeight + (loading ? 60 : 0), 
          position: 'relative' 
        }}
      >
        {visibleItems.map(({ index, offsetY }) => {
          const item = items[index];
          if (!item) return null;

          return (
            <div
              key={keyExtractor(item, index)}
              style={{
                position: 'absolute',
                top: offsetY,
                left: 0,
                right: 0,
                height: itemHeight,
                display: 'flex',
                alignItems: 'center'
              }}
              onClick={() => handleItemClick(item, index)}
            >
              {renderItem(item, index)}
            </div>
          );
        })}
        
        {/* 无限滚动触发器 */}
        {hasMore && (
          <div 
            ref={loadMoreRef} 
            style={{ 
              position: 'absolute',
              top: Math.max(0, totalHeight - itemHeight * 3),
              height: 1,
              width: '100%'
            }} 
          />
        )}
        
        {/* 加载指示器 */}
        {renderLoadingIndicator()}
      </div>
      
      {/* 滚动指示器 */}
      {renderScrollIndicator()}
    </div>
  );
}

// 高阶组件：带记忆功能的虚拟滚动列表
export function VirtualScrollListWithMemory<T>(props: VirtualScrollListProps<T>) {
  const [scrollPosition, setScrollPosition] = useState(0);
  const memoryKey = `virtual-scroll-${JSON.stringify(props.items.slice(0, 3))}`;

  // 恢复滚动位置
  useEffect(() => {
    const savedPosition = sessionStorage.getItem(memoryKey);
    if (savedPosition) {
      setScrollPosition(parseInt(savedPosition, 10));
    }
  }, [memoryKey]);

  // 保存滚动位置
  const handleScroll = useCallback((scrollTop: number) => {
    setScrollPosition(scrollTop);
    sessionStorage.setItem(memoryKey, scrollTop.toString());
    props.onScroll?.(scrollTop);
  }, [memoryKey, props]);

  return (
    <VirtualScrollList
      {...props}
      onScroll={handleScroll}
    />
  );
}

// 导出工具函数
export const VirtualScrollUtils = {
  calculateItemHeight: (sampleElement: HTMLElement): number => {
    const rect = sampleElement.getBoundingClientRect();
    return rect.height;
  },
  
  calculateOptimalOverscan: (itemHeight: number, containerHeight: number): number => {
    const visibleItems = Math.ceil(containerHeight / itemHeight);
    return Math.max(2, Math.min(10, Math.ceil(visibleItems * 0.5)));
  },
  
  estimateScrollbarWidth: (): number => {
    const outer = document.createElement('div');
    outer.style.visibility = 'hidden';
    outer.style.overflow = 'scroll';
    (outer.style as any).msOverflowStyle = 'scrollbar';
    document.body.appendChild(outer);

    const inner = document.createElement('div');
    outer.appendChild(inner);

    const scrollbarWidth = outer.offsetWidth - inner.offsetWidth;
    document.body.removeChild(outer);

    return scrollbarWidth;
  }
};