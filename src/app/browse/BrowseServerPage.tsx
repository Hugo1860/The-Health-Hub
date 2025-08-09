// 服务器组件 - 处理数据获取
import { fetchWithRetry, createErrorState, logError, type ErrorState } from '../../lib/apiErrorHandler';
import BrowsePageClient from './BrowsePageClient';

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

// 默认分类数据作为回退
const DEFAULT_CATEGORIES: Category[] = [
    { id: 'cardiology', name: '心血管' },
    { id: 'neurology', name: '神经科' },
    { id: 'internal-medicine', name: '内科学' },
    { id: 'surgery', name: '外科' },
    { id: 'pediatrics', name: '儿科' },
    { id: 'other', name: '其他' },
];

async function fetchCategories(apiUrl: string): Promise<{ data: Category[]; error?: ErrorState }> {
    const result = await fetchWithRetry<Category[]>(
        `${apiUrl}/api/categories`,
        { cache: 'force-cache' },
        { maxRetries: 2, baseDelay: 1000 }
    );

    if (result.success && result.data) {
        return { data: result.data };
    } else {
        const errorState = createErrorState(
            { message: result.error || '分类数据加载失败' },
            '获取分类数据'
        );
        
        logError(errorState, { 
            api: 'categories',
            url: `${apiUrl}/api/categories`
        });

        return {
            data: DEFAULT_CATEGORIES,
            error: errorState
        };
    }
}

async function fetchAudios(apiUrl: string, searchParams: { [key: string]: string | string[] | undefined }): Promise<{ data: AudioFile[]; pagination: PaginationInfo; error?: ErrorState }> {
    const query = new URLSearchParams();
    if (searchParams?.search) query.set('search', searchParams.search as string);
    if (searchParams?.category) query.set('category', searchParams.category as string);
    if (searchParams?.page) query.set('page', searchParams.page as string);

    const url = `${apiUrl}/api/audio?${query.toString()}`;
    const result = await fetchWithRetry<{ data: AudioFile[]; pagination: PaginationInfo }>(
        url,
        { cache: 'no-store' },
        { maxRetries: 3, baseDelay: 1000 }
    );

    if (result.success && result.data) {
        return {
            data: result.data.data || [],
            pagination: result.data.pagination || { page: 1, limit: 10, totalItems: 0, totalPages: 0 }
        };
    } else {
        const errorState = createErrorState(
            { message: result.error || '音频数据加载失败' },
            '获取音频数据'
        );
        
        logError(errorState, { 
            api: 'audio',
            url,
            searchParams
        });

        return {
            data: [],
            pagination: { page: 1, limit: 10, totalItems: 0, totalPages: 0 },
            error: errorState
        };
    }
}

export default async function BrowseServerPage({ searchParams }: { searchParams: Promise<{ [key:string]: string | string[] | undefined }> }) {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    const resolvedSearchParams = await searchParams;

    try {
        // Fetch data in parallel with error handling
        const [categoriesResult, audioResult] = await Promise.all([
            fetchCategories(API_URL),
            fetchAudios(API_URL, resolvedSearchParams)
        ]);

        // 如果两个 API 都失败了，显示主要错误
        if (categoriesResult.error && audioResult.error) {
            return (
                <BrowsePageClient
                    initialCategories={DEFAULT_CATEGORIES}
                    initialAudios={[]}
                    initialPagination={{ page: 1, limit: 10, totalItems: 0, totalPages: 0 }}
                    initialSearch={resolvedSearchParams?.search as string || ''}
                    initialCategory={resolvedSearchParams?.category as string || ''}
                    initialError={{
                        hasError: true,
                        message: '页面数据加载失败，请检查网络连接',
                        type: 'network',
                        severity: 'high',
                        retryable: true
                    }}
                />
            );
        }

        return (
            <BrowsePageClient
                initialCategories={categoriesResult.data}
                initialAudios={audioResult.data}
                initialPagination={audioResult.pagination}
                initialSearch={resolvedSearchParams?.search as string || ''}
                initialCategory={resolvedSearchParams?.category as string || ''}
                initialError={audioResult.error || categoriesResult.error}
            />
        );
    } catch (error) {
        console.error('Unexpected error in BrowseServerPage:', error);
        
        // 最后的错误回退
        return (
            <BrowsePageClient
                initialCategories={DEFAULT_CATEGORIES}
                initialAudios={[]}
                initialPagination={{ page: 1, limit: 10, totalItems: 0, totalPages: 0 }}
                initialSearch={resolvedSearchParams?.search as string || ''}
                initialCategory={resolvedSearchParams?.category as string || ''}
                initialError={{
                    hasError: true,
                    message: '页面加载时发生未知错误',
                    type: 'unknown',
                    severity: 'critical',
                    retryable: true
                }}
            />
        );
    }
}