'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAudioStore } from '../../store/audioStore';
import AntdHomeLayout from '../../components/AntdHomeLayout';
import { useState, useEffect } from 'react';
import { Alert, Button, Skeleton, Card, Empty, Typography } from 'antd';

const { Title, Text } = Typography;
import { ReloadOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { createErrorState, logError, networkMonitor, type ErrorState } from '../../lib/apiErrorHandler';
import { ComponentErrorBoundary } from '../../components/ErrorBoundary';
import { 
    AudioGridSkeleton, 
    FilterControlsSkeleton, 
    SmartLoader,
    DelayedLoader 
} from '../../components/LoadingStates';

// --- Types ---
interface AudioFile {
  id: string;
  title: string;
  description: string;
  url: string;
  filename: string;
  uploadDate: string;
  subject: string;
  tags: string[];
  coverImage?: string;
}

interface Category {
  id: string;
  name: string;
}

interface PaginationInfo {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
}

interface LoadingState {
    isLoading: boolean;
    loadingText?: string;
}

// --- UI Components ---

const BrowseHeader = () => (
  <div className="mb-8 text-center">
    <h1 className="text-3xl font-bold text-gray-800 mb-2">浏览音频内容</h1>
    <p className="text-base text-gray-500">探索丰富的医学音频资源，按分类查找您需要的内容</p>
  </div>
);

const ErrorDisplay = ({ 
  error, 
  onRetry, 
  isOnline 
}: { 
  error: ErrorState; 
  onRetry: () => void; 
  isOnline: boolean;
}) => (
  <div className="flex flex-col items-center justify-center py-16">
    <Alert
      message={error.type === 'network' && !isOnline ? "网络连接已断开" : "页面加载失败"}
      description={
        <div>
          <p>{error.message}</p>
          {error.type === 'network' && !isOnline && (
            <p className="mt-2 text-sm text-gray-500">
              请检查网络连接，连接恢复后将自动重试
            </p>
          )}
        </div>
      }
      type="error"
      showIcon
      icon={<ExclamationCircleOutlined />}
      className="mb-4 max-w-md"
    />
    {error.retryable && isOnline && (
      <Button 
        type="primary" 
        icon={<ReloadOutlined />} 
        onClick={onRetry}
        size="large"
      >
        重试
      </Button>
    )}
    {error.type === 'auth' && (
      <Button 
        type="default" 
        onClick={() => window.location.href = '/auth/signin'}
        size="large"
        className="ml-2"
      >
        重新登录
      </Button>
    )}
  </div>
);

const EmptyState = ({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) => (
  <div className="text-center py-16">
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        hasFilters 
          ? "没有找到符合条件的音频内容" 
          : "暂无音频内容"
      }
    >
      {hasFilters && (
        <Button type="primary" onClick={onClearFilters}>
          清除筛选条件
        </Button>
      )}
    </Empty>
  </div>
);

const FilterControls = ({ categories, initialSearch, initialCategory }: {
    categories: Category[];
    initialSearch: string;
    initialCategory: string;
}) => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [searchTerm, setSearchTerm] = useState(initialSearch);
    const [selectedCategory, setSelectedCategory] = useState(initialCategory);

    useEffect(() => {
        const handler = setTimeout(() => {
            const params = new URLSearchParams(searchParams.toString());
            if (searchTerm) {
                params.set('search', searchTerm);
            } else {
                params.delete('search');
            }
            if (selectedCategory) {
                params.set('category', selectedCategory);
            } else {
                params.delete('category');
            }
            params.set('page', '1');
            router.push(`/browse?${params.toString()}`);
        }, 500);

        return () => clearTimeout(handler);
    }, [searchTerm, selectedCategory, router, searchParams]);

    const clearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
    };

    return (
        <Card className="mb-6" style={{ borderRadius: 12 }}>
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
                <div className="flex-1">
                    <input
                        type="search"
                        placeholder="搜索音频标题、描述或标签..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        style={{ fontSize: 14 }}
                    />
                </div>
                <div className="flex gap-3">
                    <select
                        value={selectedCategory}
                        onChange={(e) => setSelectedCategory(e.target.value)}
                        className="px-4 py-3 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all min-w-[160px]"
                        style={{ fontSize: 14 }}
                    >
                        <option value="">全部分类</option>
                        {categories.map((category: Category) => (
                            <option key={category.id} value={category.name}>{category.name}</option>
                        ))}
                    </select>
                    <Button
                        onClick={clearFilters}
                        style={{ 
                            borderRadius: 8,
                            height: 48,
                            fontSize: 14
                        }}
                    >
                        清除
                    </Button>
                </div>
            </div>
        </Card>
    );
};

const AudioCard = ({ audio, isPlaying, onPlayClick }: {
    audio: AudioFile;
    isPlaying: boolean;
    onPlayClick: () => void;
}) => {
    const router = useRouter();
    return (
        <Card
            hoverable
            className="overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{ 
                borderRadius: 12,
                border: '1px solid #f0f0f0'
            }}
            cover={
                <div className="relative h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center group">
                    {audio.coverImage ? (
                        <img 
                            src={audio.coverImage} 
                            alt={audio.title} 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                            <svg className="w-15 h-15 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" style={{ width: '60px', height: '60px' }}>
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
                            </svg>
                            <span className="text-xs">音频内容</span>
                        </div>
                    )}
                    <div
                        className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 flex items-center justify-center transition-all duration-300 cursor-pointer"
                        onClick={onPlayClick}
                    >
                        <Button
                            type="primary"
                            shape="circle"
                            size="large"
                            icon={
                                isPlaying ? (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M5 4h3v12H5V4zm7 0h3v12h-3V4z"/>
                                    </svg>
                                ) : (
                                    <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                                        <path d="M4.52 16.89A.5.5 0 0 1 4 16.5v-13a.5.5 0 0 1 .74-.43l11 6.5a.5.5 0 0 1 0 .86l-11 6.5a.5.5 0 0 1-.22.03z"/>
                                    </svg>
                                )
                            }
                            className="transform scale-0 group-hover:scale-100 transition-transform duration-300"
                            style={{ 
                                backgroundColor: '#13C2C2',
                                borderColor: '#13C2C2'
                            }}
                        />
                    </div>
                </div>
            }
        >
            <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                        {audio.subject}
                    </span>
                    <span className="text-xs text-gray-400">
                        {new Date(audio.uploadDate).toLocaleDateString('zh-CN')}
                    </span>
                </div>
                <h3 
                    className="text-base font-semibold text-gray-800 mb-2 line-clamp-2" 
                    title={audio.title}
                    style={{ 
                        minHeight: '2.5rem',
                        lineHeight: '1.25rem'
                    }}
                >
                    {audio.title}
                </h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2" style={{ minHeight: '2.5rem' }}>
                    {audio.description}
                </p>
                <Button
                    type="link"
                    onClick={() => router.push(`/audio/${audio.id}`)}
                    className="p-0 h-auto text-blue-600 hover:text-blue-800"
                    style={{ fontSize: 14 }}
                >
                    查看详情 →
                </Button>
            </div>
        </Card>
    );
};

const AudioGrid = ({ audios }: { audios: AudioFile[] }) => {
    const { currentAudio, setCurrentAudio, isPlaying, togglePlayPause } = useAudioStore();

    const handlePlayAudio = (audio: AudioFile) => {
        if (currentAudio?.id === audio.id) {
            togglePlayPause();
        } else {
            setCurrentAudio(audio);
        }
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {audios.map((audio: AudioFile) => (
                <AudioCard
                    key={audio.id}
                    audio={audio}
                    isPlaying={currentAudio?.id === audio.id && isPlaying}
                    onPlayClick={() => handlePlayAudio(audio)}
                />
            ))}
        </div>
    );
};

const Pagination = ({ pagination }: { pagination: PaginationInfo }) => {
    const router = useRouter();
    const searchParams = useSearchParams();

    const handlePageChange = (page: number) => {
        const params = new URLSearchParams(searchParams.toString());
        params.set('page', page.toString());
        router.push(`/browse?${params.toString()}`);
    };

    if (pagination.totalPages <= 1) return null;

    return (
        <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
                <Button
                    onClick={() => handlePageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    style={{ borderRadius: 8 }}
                >
                    上一页
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600">
                    第 {pagination.page} 页，共 {pagination.totalPages} 页
                </span>
                <Button
                    onClick={() => handlePageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    style={{ borderRadius: 8 }}
                >
                    下一页
                </Button>
            </div>
        </div>
    );
}

// --- Main Client Component ---
export default function BrowsePageClient({ 
    initialCategories, 
    initialAudios, 
    initialPagination, 
    initialSearch, 
    initialCategory,
    initialError 
}: {
    initialCategories: Category[];
    initialAudios: AudioFile[];
    initialPagination: PaginationInfo;
    initialSearch: string;
    initialCategory: string;
    initialError?: ErrorState;
}) {
    const [categories, setCategories] = useState<Category[]>(initialCategories);
    const [audios, setAudios] = useState<AudioFile[]>(initialAudios);
    const [pagination, setPagination] = useState<PaginationInfo>(initialPagination);
    const [error, setError] = useState<ErrorState | null>(initialError || null);
    const [loading, setLoading] = useState<LoadingState>({ isLoading: false });
    const [retryCount, setRetryCount] = useState(0);
    const [isOnline, setIsOnline] = useState(true);

    const router = useRouter();
    const searchParams = useSearchParams();

    // 网络状态监听
    useEffect(() => {
        const handleNetworkChange = (online: boolean) => {
            setIsOnline(online);
            if (online && error?.type === 'network') {
                handleRetry();
            }
        };

        networkMonitor.addListener(handleNetworkChange);
        return () => networkMonitor.removeListener(handleNetworkChange);
    }, [error]);

    // 重试逻辑
    const handleRetry = async () => {
        if (retryCount >= 3) {
            const maxRetriesError = createErrorState(
                { message: "多次重试失败，请稍后再试或联系技术支持" },
                '重试失败'
            );
            maxRetriesError.retryable = false;
            setError(maxRetriesError);
            logError(maxRetriesError, { retryCount, context: 'max_retries_exceeded' });
            return;
        }

        setLoading({ isLoading: true, loadingText: "正在重新加载..." });
        setError(null);
        setRetryCount(prev => prev + 1);

        try {
            const delay = 1000 * Math.pow(2, retryCount);
            await new Promise(resolve => setTimeout(resolve, delay));
            window.location.reload();
        } catch (err) {
            const retryError = createErrorState(err, '重试操作');
            setError(retryError);
            logError(retryError, { retryCount, originalError: error });
        } finally {
            setLoading({ isLoading: false });
        }
    };

    const handleClearFilters = () => {
        router.push('/browse');
    };

    const hasFilters = Boolean(initialSearch || initialCategory);

    if (loading.isLoading) {
        return (
            <AntdHomeLayout>
                <div className="container mx-auto px-4 py-8">
                    <BrowseHeader />
                    <DelayedLoader delay={200}>
                        <SmartLoader text={loading.loadingText} />
                    </DelayedLoader>
                </div>
            </AntdHomeLayout>
        );
    }

    if (error?.hasError) {
        return (
            <AntdHomeLayout>
                <div className="container mx-auto px-4 py-8">
                    <BrowseHeader />
                    <ErrorDisplay error={error} onRetry={handleRetry} isOnline={isOnline} />
                </div>
            </AntdHomeLayout>
        );
    }

    return (
        <AntdHomeLayout>
            <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
                <BrowseHeader />
                
                <ComponentErrorBoundary>
                    <Suspense fallback={<FilterControlsSkeleton />}>
                        <FilterControls
                            categories={categories}
                            initialSearch={initialSearch}
                            initialCategory={initialCategory}
                        />
                    </Suspense>
                </ComponentErrorBoundary>
                
                <ComponentErrorBoundary>
                    {audios.length > 0 ? (
                        <>
                            <Suspense fallback={<AudioGridSkeleton />}>
                                <AudioGrid audios={audios} />
                            </Suspense>
                            <Suspense fallback={<div className="flex justify-center mt-8"><Skeleton.Button active /></div>}>
                                <Pagination pagination={pagination} />
                            </Suspense>
                        </>
                    ) : (
                        <EmptyState 
                            hasFilters={hasFilters} 
                            onClearFilters={handleClearFilters} 
                        />
                    )}
                </ComponentErrorBoundary>
            </div>
        </AntdHomeLayout>
    );
}