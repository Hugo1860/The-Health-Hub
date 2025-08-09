import { Suspense } from 'react';
import { PageErrorBoundary } from '../../components/ErrorBoundary';
import { BrowsePageSkeleton } from '../../components/LoadingStates';
import AntdHomeLayout from '../../components/AntdHomeLayout';
import BrowseServerPage from './BrowseServerPage';

const BrowseHeader = () => (
  <div className="mb-8">
    <h1 className="text-4xl font-bold text-gray-800">Browse Audio</h1>
    <p className="text-lg text-gray-500 mt-2">Explore all our audio content by category.</p>
  </div>
);

export default function BrowsePageWrapper({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    return (
        <PageErrorBoundary>
            <Suspense fallback={
                <AntdHomeLayout>
                    <div className="container mx-auto px-4 py-8">
                        <BrowseHeader />
                        <BrowsePageSkeleton text="正在加载页面..." />
                    </div>
                </AntdHomeLayout>
            }>
                <BrowseServerPage searchParams={searchParams} />
            </Suspense>
        </PageErrorBoundary>
    );
}
