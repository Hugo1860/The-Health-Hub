'use client';

import { useState, useEffect, useRef, useMemo, ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export default function VirtualList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { startIndex, endIndex };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  // 计算总高度
  const totalHeight = items.length * itemHeight;

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (items[i]) {
        result.push({
          item: items[i],
          index: i,
          offsetY: i * itemHeight,
        });
      }
    }
    return result;
  }, [items, visibleRange, itemHeight]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, offsetY }) => (
          <div
            key={index}
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
              height: itemHeight,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}

// 自适应高度的虚拟列表
interface DynamicVirtualListProps<T> {
  items: T[];
  estimatedItemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => ReactNode;
  overscan?: number;
  className?: string;
  onScroll?: (scrollTop: number) => void;
}

export function DynamicVirtualList<T>({
  items,
  estimatedItemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = '',
  onScroll,
}: DynamicVirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [itemHeights, setItemHeights] = useState<number[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Map<number, HTMLDivElement>>(new Map());

  // 更新项目高度
  const updateItemHeight = (index: number, height: number) => {
    setItemHeights(prev => {
      const newHeights = [...prev];
      newHeights[index] = height;
      return newHeights;
    });
  };

  // 计算项目位置
  const getItemOffset = (index: number) => {
    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += itemHeights[i] || estimatedItemHeight;
    }
    return offset;
  };

  // 计算总高度
  const totalHeight = useMemo(() => {
    return items.reduce((total, _, index) => {
      return total + (itemHeights[index] || estimatedItemHeight);
    }, 0);
  }, [items.length, itemHeights, estimatedItemHeight]);

  // 计算可见范围
  const visibleRange = useMemo(() => {
    let startIndex = 0;
    let endIndex = items.length - 1;
    let currentOffset = 0;

    // 找到开始索引
    for (let i = 0; i < items.length; i++) {
      const itemHeight = itemHeights[i] || estimatedItemHeight;
      if (currentOffset + itemHeight > scrollTop) {
        startIndex = Math.max(0, i - overscan);
        break;
      }
      currentOffset += itemHeight;
    }

    // 找到结束索引
    currentOffset = getItemOffset(startIndex);
    for (let i = startIndex; i < items.length; i++) {
      if (currentOffset > scrollTop + containerHeight) {
        endIndex = Math.min(items.length - 1, i + overscan);
        break;
      }
      currentOffset += itemHeights[i] || estimatedItemHeight;
    }

    return { startIndex, endIndex };
  }, [scrollTop, containerHeight, items.length, itemHeights, estimatedItemHeight, overscan]);

  // 计算可见项目
  const visibleItems = useMemo(() => {
    const result = [];
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex; i++) {
      if (items[i]) {
        result.push({
          item: items[i],
          index: i,
          offsetY: getItemOffset(i),
        });
      }
    }
    return result;
  }, [items, visibleRange, itemHeights, estimatedItemHeight]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  };

  // 观察项目高度变化
  useEffect(() => {
    const observer = new ResizeObserver((entries) => {
      entries.forEach((entry) => {
        const element = entry.target as HTMLDivElement;
        const index = parseInt(element.dataset.index || '0');
        const height = entry.contentRect.height;
        updateItemHeight(index, height);
      });
    });

    itemRefs.current.forEach((element) => {
      observer.observe(element);
    });

    return () => observer.disconnect();
  }, [visibleItems]);

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(({ item, index, offsetY }) => (
          <div
            key={index}
            data-index={index}
            ref={(el) => {
              if (el) {
                itemRefs.current.set(index, el);
              } else {
                itemRefs.current.delete(index);
              }
            }}
            style={{
              position: 'absolute',
              top: offsetY,
              left: 0,
              right: 0,
            }}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
    </div>
  );
}