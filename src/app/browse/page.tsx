import { Suspense } from 'react';
import BrowsePageClient from './BrowsePageClient';

const BrowsePageSkeleton = () => (
  <div className="space-y-6">
    <div className="text-center">
      <div className="animate-pulse bg-gray-200 h-8 w-48 mx-auto mb-4"></div>
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="bg-gray-200 h-48 rounded-lg mb-4"></div>
          <div className="bg-gray-200 h-4 rounded mb-2"></div>
          <div className="bg-gray-200 h-3 rounded"></div>
        </div>
      ))}
    </div>
  </div>
);

export default function BrowsePageWrapper({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    return (
        <div className="container mx-auto px-4 py-8">
            <Suspense fallback={<BrowsePageSkeleton />}>
                <BrowsePageClient searchParams={searchParams} />
            </Suspense>
        </div>
    );
}