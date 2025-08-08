'use client';

interface SkeletonLoaderProps {
  className?: string;
  variant?: 'card' | 'text' | 'circle' | 'rectangle';
  width?: string;
  height?: string;
  count?: number;
}

export default function SkeletonLoader({ 
  className = '', 
  variant = 'rectangle',
  width = 'w-full',
  height = 'h-4',
  count = 1
}: SkeletonLoaderProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case 'card':
        return 'rounded-2xl p-6';
      case 'text':
        return 'rounded';
      case 'circle':
        return 'rounded-full';
      case 'rectangle':
      default:
        return 'rounded-lg';
    }
  };

  const skeletonElement = (
    <div 
      className={`bg-gray-200 animate-pulse ${width} ${height} ${getVariantClasses()} ${className}`}
    />
  );

  if (count === 1) {
    return skeletonElement;
  }

  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>
          {skeletonElement}
        </div>
      ))}
    </div>
  );
}

// 预定义的骨架屏组件
export function CardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}>
      <SkeletonLoader variant="rectangle" height="h-48" className="rounded-none" />
      <div className="p-6 space-y-3">
        <SkeletonLoader variant="text" height="h-6" width="w-3/4" />
        <SkeletonLoader variant="text" height="h-4" width="w-full" />
        <SkeletonLoader variant="text" height="h-4" width="w-2/3" />
        <div className="flex justify-between items-center pt-2">
          <SkeletonLoader variant="text" height="h-6" width="w-20" />
          <SkeletonLoader variant="rectangle" height="h-8" width="w-16" />
        </div>
      </div>
    </div>
  );
}

export function ListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-md p-4">
          <div className="flex items-start space-x-4">
            <SkeletonLoader variant="circle" width="w-12" height="h-12" />
            <div className="flex-1 space-y-2">
              <SkeletonLoader variant="text" height="h-5" width="w-3/4" />
              <SkeletonLoader variant="text" height="h-4" width="w-full" />
              <SkeletonLoader variant="text" height="h-4" width="w-1/2" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}