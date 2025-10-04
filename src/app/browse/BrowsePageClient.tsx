'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioStore } from '../../store/audioStore';
import AntdHomeLayout from '../../components/AntdHomeLayout';
import { Alert, Button, Card, Empty, Typography, Input, Select, Skeleton, Table, Space, Tag } from 'antd';
import { ReloadOutlined, ExclamationCircleOutlined, PlayCircleOutlined, PauseCircleOutlined, EyeOutlined } from '@ant-design/icons';
import ErrorBoundary from '../../components/ErrorBoundary';
import ClientOnly from '../../components/ClientOnly';
import SafeTimeDisplay from '../../components/SafeTimeDisplay';
import '../../styles/modern-home.css';
import '../../styles/browse-list.css';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;

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
  playCount?: number;
  duration?: number;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  parentId?: string | null;
  level: 1 | 2;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
  audioCount?: number;
}

interface PaginationInfo {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage?: boolean;
    hasPrevPage?: boolean;
}

// 默认分类数据
const DEFAULT_CATEGORIES: Category[] = [
    { 
      id: 'cardiology', 
      name: '心血管', 
      level: 1, 
      sortOrder: 0, 
      isActive: true, 
      children: [] 
    },
    { 
      id: 'neurology', 
      name: '神经科', 
      level: 1, 
      sortOrder: 1, 
      isActive: true, 
      children: [] 
    },
    { 
      id: 'internal-medicine', 
      name: '内科学', 
      level: 1, 
      sortOrder: 2, 
      isActive: true, 
      children: [] 
    },
    { 
      id: 'surgery', 
      name: '外科', 
      level: 1, 
      sortOrder: 3, 
      isActive: true, 
      children: [] 
    },
    { 
      id: 'pediatrics', 
      name: '儿科', 
      level: 1, 
      sortOrder: 4, 
      isActive: true, 
      children: [] 
    },
    { 
      id: 'other', 
      name: '其他', 
      level: 1, 
      sortOrder: 5, 
      isActive: true, 
      children: [] 
    },
];

// --- UI Components ---
const BrowseHeader = () => (
  <div className="mb-8 text-center">
    <h1 className="modern-title text-3xl mb-2" style={{ fontSize: '32px' }}>浏览音频内容</h1>
    <p className="modern-subtitle text-base">探索丰富的医学音频资源，按分类查找您需要的内容</p>
  </div>
);

const ErrorDisplay = ({ 
  error, 
  onRetry 
}: { 
  error: string; 
  onRetry: () => void; 
}) => (
  <div className="flex flex-col items-center justify-center py-16">
    <Alert
      message="页面加载失败"
      description={error}
      type="error"
      showIcon
      icon={<ExclamationCircleOutlined />}
      className="mb-4 max-w-md"
      style={{ borderRadius: 16, border: '1px solid rgba(255, 77, 79, 0.2)' }}
    />
    <Button 
      type="primary" 
      icon={<ReloadOutlined />} 
      onClick={onRetry}
      size="large"
      className="modern-btn-primary"
      style={{ borderRadius: 14 }}
    >
      重试
    </Button>
  </div>
);

const EmptyState = ({ hasFilters, onClearFilters }: { hasFilters: boolean; onClearFilters: () => void }) => (
  <div className="text-center py-16">
    <Empty
      image={Empty.PRESENTED_IMAGE_SIMPLE}
      description={
        <span className="modern-text">
          {hasFilters 
            ? "没有找到符合条件的音频内容" 
            : "暂无音频内容"}
        </span>
      }
    >
      {hasFilters && (
        <Button 
          type="primary" 
          onClick={onClearFilters}
          className="modern-btn-primary"
          style={{ borderRadius: 14 }}
        >
          清除筛选条件
        </Button>
      )}
    </Empty>
  </div>
);


const FilterControls = ({ 
  categories, 
  onSearch, 
  onCategoryChange,
  onClear,
  loading 
}: {
  categories: Category[];
  onSearch: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onClear: () => void;
  loading: boolean;
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    onSearch(value);
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    onCategoryChange(value);
  };

  const handleClear = () => {
    setSearchTerm('');
    setSelectedCategory('');
    onClear();
  };

  // 创建层级分类选项
  const createCategoryOptions = () => {
    const options: React.ReactElement[] = [];
    
    categories.filter(cat => cat.level === 1).forEach(category => {
      // 添加一级分类
      options.push(
        <Option key={category.id} value={category.name}>
          <span style={{ fontWeight: 'bold' }}>
            {category.icon} {category.name}
            {category.audioCount !== undefined && (
              <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                ({category.audioCount})
              </span>
            )}
          </span>
        </Option>
      );
      
      // 添加二级分类
      if (category.children && category.children.length > 0) {
        category.children.forEach(subcategory => {
          options.push(
            <Option key={subcategory.id} value={subcategory.name}>
              <span style={{ paddingLeft: 16, color: '#666' }}>
                └ {subcategory.name}
                {subcategory.audioCount !== undefined && (
                  <span style={{ marginLeft: 8, color: '#999', fontSize: 12 }}>
                    ({subcategory.audioCount})
                  </span>
                )}
              </span>
            </Option>
          );
        });
      }
    });
    
    return options;
  };

  return (
    <Card className="modern-card mb-6" style={{ borderRadius: 16, border: '1px solid rgba(0, 0, 0, 0.06)' }}>
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1">
          <Search
            placeholder="搜索音频标题、描述或标签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={handleSearch}
            loading={loading}
            size="large"
            className="modern-search-input"
            style={{ borderRadius: 16 }}
          />
        </div>
        <div className="flex gap-3">
          <Select
            value={selectedCategory}
            onChange={handleCategoryChange}
            placeholder="选择分类"
            size="large"
            style={{ minWidth: 200, borderRadius: 14, border: '1.5px solid #e0e0e0' }}
            allowClear
            showSearch
            filterOption={(input, option) =>
              (option?.children?.toString() ?? '').toLowerCase().includes(input.toLowerCase())
            }
          >
            {createCategoryOptions()}
          </Select>
          <Button
            onClick={handleClear}
            size="large"
            className="modern-btn-secondary"
            style={{ borderRadius: 14 }}
          >
            清除
          </Button>
        </div>
      </div>
    </Card>
  );
};


// 列表视图组件
const AudioListView = ({ audios }: { audios: AudioFile[] }) => {
    const { currentAudio, setCurrentAudio, isPlaying, setIsPlaying, togglePlayPause } = useAudioStore();
    const router = useRouter();

    const handlePlayAudio = (audio: AudioFile) => {
        if (currentAudio?.id === audio.id) {
            togglePlayPause();
        } else {
            setCurrentAudio(audio);
            setIsPlaying(true);
        }
    };

    // 格式化时长显示
    const formatDuration = (seconds?: number) => {
        if (!seconds) return '-';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const columns = [
        {
            title: '音频名称',
            dataIndex: 'title',
            key: 'title',
            width: '35%',
            render: (text: string, record: AudioFile) => (
                <div className="flex items-center gap-3">
                    <Button
                        type="text"
                        shape="circle"
                        size="small"
                        icon={currentAudio?.id === record.id && isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                        onClick={() => handlePlayAudio(record)}
                        style={{ 
                            color: currentAudio?.id === record.id ? '#1890ff' : '#666',
                            fontSize: '18px'
                        }}
                    />
                    <div className="flex-1">
                        <div className="font-medium text-gray-800 hover:text-blue-600 cursor-pointer" 
                             onClick={() => router.push(`/audio/${record.id}`)}>
                            {text}
                        </div>
                        {record.description && (
                            <div className="text-xs text-gray-400 line-clamp-1 mt-1">
                                {record.description}
                            </div>
                        )}
                    </div>
                </div>
            ),
        },
        {
            title: '分类',
            dataIndex: 'tags',
            key: 'tags',
            width: '20%',
            render: (tags: string[]) => (
                <div className="flex flex-wrap gap-1">
                    {tags && tags.length > 0 ? (
                        tags.slice(0, 2).map((tag, index) => (
                            <Tag key={index} color="blue" style={{ fontSize: '12px' }}>
                                {tag}
                            </Tag>
                        ))
                    ) : (
                        <span className="text-gray-400 text-sm">未分类</span>
                    )}
                </div>
            ),
        },
        {
            title: '专业',
            dataIndex: 'subject',
            key: 'subject',
            width: '20%',
            render: (subject: string) => (
                <Tag color="cyan" style={{ fontSize: '12px' }}>
                    {subject || '未设置'}
                </Tag>
            ),
        },
        {
            title: '时长',
            dataIndex: 'duration',
            key: 'duration',
            width: '10%',
            render: (duration: number) => (
                <span className="text-gray-600 text-sm font-mono">
                    {formatDuration(duration)}
                </span>
            ),
        },
        {
            title: '操作',
            key: 'actions',
            width: '15%',
            render: (_: any, record: AudioFile) => (
                <Space size="small">
                    <Button
                        type="link"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={() => router.push(`/audio/${record.id}`)}
                    >
                        查看详情
                    </Button>
                </Space>
            ),
        },
    ];

    return (
        <Table
            columns={columns}
            dataSource={audios}
            rowKey="id"
            pagination={false}
            className="audio-list-table"
            style={{ 
                backgroundColor: 'white',
                borderRadius: '12px',
                overflow: 'hidden'
            }}
            rowClassName={(record) => 
                currentAudio?.id === record.id ? 'bg-blue-50' : ''
            }
        />
    );
};


const Pagination = ({ pagination, onPageChange }: { 
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}) => {
    if (pagination.totalPages <= 1) return null;

    return (
        <div className="flex justify-center mt-8">
            <div className="flex items-center gap-3 bg-white rounded-full px-6 py-3 shadow-sm" 
                 style={{ 
                   border: '1px solid rgba(0, 0, 0, 0.06)',
                   backdropFilter: 'blur(10px)'
                 }}>
                <Button
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    className="modern-btn-secondary"
                    style={{ borderRadius: 20 }}
                >
                    上一页
                </Button>
                <span className="px-4 py-2 text-sm font-medium" style={{ color: '#666', minWidth: '150px', textAlign: 'center' }}>
                    第 {pagination.page} 页，共 {pagination.totalPages} 页
                </span>
                <Button
                    onClick={() => onPageChange(pagination.page + 1)}
                    disabled={!pagination.hasNextPage}
                    className="modern-btn-secondary"
                    style={{ borderRadius: 20 }}
                >
                    下一页
                </Button>
            </div>
        </div>
    );
}

// --- Main Client Component ---
export default function BrowsePageClient({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [audios, setAudios] = useState<AudioFile[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 12, totalItems: 0, totalPages: 0 });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');

    const router = useRouter();

    // 获取层级分类数据
    const fetchCategories = async () => {
        setCategoriesLoading(true);
        try {
            const response = await fetch('/api/categories?format=tree&includeCount=true');
            if (response.ok) {
                const result = await response.json();
                let categoriesData = [];
                
                if (result.success && result.categories) {
                    categoriesData = result.categories;
                } else if (Array.isArray(result)) {
                    categoriesData = result;
                } else if (result.data && Array.isArray(result.data)) {
                    categoriesData = result.data;
                }
                
                const formattedCategories = categoriesData.map((cat: any) => ({
                    id: cat.id,
                    name: cat.name,
                    description: cat.description,
                    color: cat.color || '#13C2C2',
                    icon: cat.icon || '📝',
                    parentId: cat.parentId,
                    level: cat.level || 1,
                    sortOrder: cat.sortOrder || 0,
                    isActive: cat.isActive !== false,
                    children: cat.children || [],
                    audioCount: cat.audioCount || 0
                }));
                
                setCategories(formattedCategories);
            }
        } catch (err) {
            console.error('获取分类数据失败:', err);
            // 保持使用默认分类
        } finally {
            setCategoriesLoading(false);
        }
    };

    // 获取音频数据
    const fetchAudios = async (search?: string, category?: string, page: number = 1) => {
        setLoading(true);
        setError(null);
        
        try {
            const params = new URLSearchParams();
            if (search) params.set('search', search);
            if (category) params.set('category', category);
            params.set('page', page.toString());
            params.set('limit', '12');

            const response = await fetch(`/api/audio-fixed?${params.toString()}`);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            
            if (data.success) {
                const audiosData = data.data || [];
                setAudios(audiosData);
                setPagination(data.pagination || { page: 1, limit: 12, totalItems: 0, totalPages: 0 });
            } else {
                throw new Error(data.error || '获取音频数据失败');
            }
        } catch (err) {
            console.error('获取音频数据失败:', err);
            setError(err instanceof Error ? err.message : '获取音频数据失败');
            setAudios([]);
            setPagination({ page: 1, limit: 12, totalItems: 0, totalPages: 0 });
        } finally {
            setLoading(false);
        }
    };


    // 初始化数据
    useEffect(() => {
        fetchCategories();
        fetchAudios();
    }, []);

    // 处理URL参数
    useEffect(() => {
        const processSearchParams = async () => {
            const params = await searchParams;
            const categoryParam = params.category as string;
            
            if (categoryParam) {
                setSelectedCategory(categoryParam);
                fetchAudios('', categoryParam, 1);
            }
        };
        
        processSearchParams();
    }, [searchParams]);

    // 处理搜索
    const handleSearch = (value: string) => {
        setSearchTerm(value);
        fetchAudios(value, selectedCategory, 1);
    };

    // 处理分类变化
    const handleCategoryChange = (value: string) => {
        setSelectedCategory(value);
        fetchAudios(searchTerm, value, 1);
    };

    // 处理清除筛选
    const handleClearFilters = () => {
        setSearchTerm('');
        setSelectedCategory('');
        fetchAudios('', '', 1);
    };

    // 处理分页
    const handlePageChange = (page: number) => {
        fetchAudios(searchTerm, selectedCategory, page);
    };

    // 重试
    const handleRetry = () => {
        fetchAudios(searchTerm, selectedCategory, pagination.page);
    };

    const hasFilters = Boolean(searchTerm || selectedCategory);

    if (error) {
        return (
            <AntdHomeLayout>
                <div className="container mx-auto px-4 py-8">
                    <BrowseHeader />
                    <ErrorDisplay error={error} onRetry={handleRetry} />
                </div>
            </AntdHomeLayout>
        );
    }

    return (
        <AntdHomeLayout>
            <div className="modern-home-container" style={{ maxWidth: 1400, margin: '0 auto', padding: '24px', minHeight: 'auto' }}>
                <BrowseHeader />
                
                <ErrorBoundary>
                    <FilterControls
                        categories={categories}
                        onSearch={handleSearch}
                        onCategoryChange={handleCategoryChange}
                        onClear={handleClearFilters}
                        loading={loading || categoriesLoading}
                    />
                </ErrorBoundary>
                
                <ErrorBoundary>
                    {loading ? (
                        <div className="modern-card modern-skeleton" style={{ borderRadius: 16, padding: '24px' }}>
                            <Skeleton active paragraph={{ rows: 8 }} />
                        </div>
                    ) : audios.length > 0 ? (
                        <>
                            {/* 统一显示列表视图 */}
                            <AudioListView audios={audios} />
                            <Pagination pagination={pagination} onPageChange={handlePageChange} />
                        </>
                    ) : (
                        <EmptyState 
                            hasFilters={hasFilters} 
                            onClearFilters={handleClearFilters} 
                        />
                    )}
                </ErrorBoundary>
            </div>
        </AntdHomeLayout>
    );
}