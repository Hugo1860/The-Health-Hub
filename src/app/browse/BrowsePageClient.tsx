'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAudioStore } from '../../store/audioStore';
import AntdHomeLayout from '../../components/AntdHomeLayout';
import { Alert, Button, Card, Empty, Typography, Input, Select, Skeleton } from 'antd';
import { ReloadOutlined, ExclamationCircleOutlined, PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons';
import ErrorBoundary from '../../components/ErrorBoundary';
import ClientOnly from '../../components/ClientOnly';
import SafeTimeDisplay from '../../components/SafeTimeDisplay';

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
    <h1 className="text-3xl font-bold text-gray-800 mb-2">浏览音频内容</h1>
    <p className="text-base text-gray-500">探索丰富的医学音频资源，按分类查找您需要的内容</p>
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
    />
    <Button 
      type="primary" 
      icon={<ReloadOutlined />} 
      onClick={onRetry}
      size="large"
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

// 按二级学科分组的音频显示组件
const GroupedAudioDisplay = ({ 
  groupedAudios, 
  onPlay, 
  onView 
}: { 
  groupedAudios: { [key: string]: AudioFile[] };
  onPlay: (audio: AudioFile) => void;
  onView: (audioId: string) => void;
}) => {
  if (Object.keys(groupedAudios).length === 0) {
    return null;
  }

  return (
    <div className="space-y-8">
      {Object.entries(groupedAudios).map(([subcategoryName, audios]) => (
        <div key={subcategoryName} className="bg-white rounded-lg shadow-sm border p-6">
          <div className="flex items-center mb-4">
            <div className="w-1 h-6 bg-blue-500 rounded-full mr-3"></div>
            <h3 className="text-xl font-semibold text-gray-800">
              {subcategoryName}
            </h3>
            <span className="ml-2 text-sm text-gray-500">
              ({audios.length} 个音频)
            </span>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {audios.map(audio => (
              <Card
                key={audio.id}
                hoverable
                className="group transition-all duration-200 hover:shadow-md"
                  cover={
                    <div className="relative h-32 bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                      <PlayCircleOutlined 
                        className="text-blue-500 group-hover:text-blue-600 transition-colors cursor-pointer"
                        style={{ fontSize: '100px' }}
                        onClick={() => onPlay(audio)}
                      />
                    </div>
                  }
                actions={[
                  <Button 
                    type="text" 
                    icon={<PlayCircleOutlined />} 
                    onClick={() => onPlay(audio)}
                  >
                    播放
                  </Button>,
                  <Button 
                    type="text" 
                    onClick={() => onView(audio.id)}
                  >
                    详情
                  </Button>
                ]}
              >
                <Card.Meta
                  title={
                    <div className="text-sm font-medium text-gray-800 line-clamp-2">
                      {audio.title}
                    </div>
                  }
                  description={
                    <div className="space-y-1">
                      <div className="text-xs text-gray-500 line-clamp-2">
                        {audio.description || '暂无描述'}
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>{audio.subject}</span>
                        <span>{new Date(audio.uploadDate).toLocaleDateString('zh-CN')}</span>
                      </div>
                    </div>
                  }
                />
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

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
    <Card className="mb-6" style={{ borderRadius: 12 }}>
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
        <div className="flex-1">
          <Search
            placeholder="搜索音频标题、描述或标签..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onSearch={handleSearch}
            loading={loading}
            size="large"
            style={{ borderRadius: 8 }}
          />
        </div>
        <div className="flex gap-3">
          <Select
            value={selectedCategory}
            onChange={handleCategoryChange}
            placeholder="选择分类"
            size="large"
            style={{ minWidth: 200, borderRadius: 8 }}
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
            style={{ borderRadius: 8 }}
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
                    {audio.coverImage && audio.coverImage.trim() !== '' ? (
                        <img 
                            src={audio.coverImage} 
                            alt={audio.title} 
                            className="w-full h-full object-cover" 
                        />
                    ) : (
                        <div className="flex flex-col items-center justify-center text-gray-400">
                            <PlayCircleOutlined style={{ fontSize: 100, marginBottom: 8 }} />
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
                            icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
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
                        {audio.subject || '未分类'}
                    </span>
                    <ClientOnly>
                      <span className="text-xs text-gray-400">
                          <SafeTimeDisplay timestamp={audio.uploadDate} format="date" />
                      </span>
                    </ClientOnly>
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
                    {audio.description || '暂无描述'}
                </p>
                <div className="flex justify-between items-center">
                  <Button
                      type="link"
                      onClick={() => router.push(`/audio/${audio.id}`)}
                      className="p-0 h-auto text-blue-600 hover:text-blue-800"
                      style={{ fontSize: 14 }}
                  >
                      查看详情 →
                  </Button>
                  {audio.playCount !== undefined && (
                    <span className="text-xs text-gray-400">
                      {audio.playCount} 播放
                    </span>
                  )}
                </div>
            </div>
        </Card>
    );
};

const AudioGrid = ({ audios }: { audios: AudioFile[] }) => {
    const { currentAudio, setCurrentAudio, isPlaying, setIsPlaying, togglePlayPause } = useAudioStore();

    const handlePlayAudio = (audio: AudioFile) => {
        if (currentAudio?.id === audio.id) {
            togglePlayPause();
        } else {
            setCurrentAudio(audio);
            setIsPlaying(true);
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

const Pagination = ({ pagination, onPageChange }: { 
  pagination: PaginationInfo;
  onPageChange: (page: number) => void;
}) => {
    if (pagination.totalPages <= 1) return null;

    return (
        <div className="flex justify-center mt-8">
            <div className="flex items-center gap-2">
                <Button
                    onClick={() => onPageChange(pagination.page - 1)}
                    disabled={!pagination.hasPrevPage}
                    style={{ borderRadius: 8 }}
                >
                    上一页
                </Button>
                <span className="px-4 py-2 text-sm text-gray-600">
                    第 {pagination.page} 页，共 {pagination.totalPages} 页
                </span>
                <Button
                    onClick={() => onPageChange(pagination.page + 1)}
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
export default function BrowsePageClient({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
    const [categories, setCategories] = useState<Category[]>(DEFAULT_CATEGORIES);
    const [audios, setAudios] = useState<AudioFile[]>([]);
    const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 12, totalItems: 0, totalPages: 0 });
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [categoriesLoading, setCategoriesLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [groupedAudios, setGroupedAudios] = useState<{ [key: string]: AudioFile[] }>({});

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
                
                // 如果选择了分类，按二级学科分组
                if (category) {
                    groupAudiosBySubcategory(audiosData, category);
                } else {
                    setGroupedAudios({});
                }
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

    // 按二级学科分组音频
    const groupAudiosBySubcategory = (audios: AudioFile[], categoryName: string) => {
        const grouped: { [key: string]: AudioFile[] } = {};
        
        // 找到选中的分类
        const selectedCat = categories.find(cat => cat.name === categoryName);
        if (!selectedCat) {
            setGroupedAudios({});
            return;
        }
        
        // 获取该分类下的所有二级分类
        const subcategories = selectedCat.children || [];
        
        // 为每个二级分类创建分组
        subcategories.forEach(subcat => {
            grouped[subcat.name] = [];
        });
        
        // 添加"未分类"分组
        grouped['未分类'] = [];
        
        // 将音频分配到对应的二级分类
        audios.forEach(audio => {
            // 尝试匹配二级分类
            let matched = false;
            subcategories.forEach(subcat => {
                if (audio.subject?.toLowerCase().includes(subcat.name.toLowerCase()) ||
                    audio.tags?.some(tag => tag.toLowerCase().includes(subcat.name.toLowerCase()))) {
                    grouped[subcat.name].push(audio);
                    matched = true;
                }
            });
            
            // 如果没有匹配到任何二级分类，放入"未分类"
            if (!matched) {
                grouped['未分类'].push(audio);
            }
        });
        
        // 移除空的分类
        Object.keys(grouped).forEach(key => {
            if (grouped[key].length === 0) {
                delete grouped[key];
            }
        });
        
        setGroupedAudios(grouped);
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
            <div style={{ maxWidth: 1400, margin: '0 auto', padding: '24px' }}>
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                            {Array.from({ length: 12 }).map((_, i) => (
                                <Card key={i} loading style={{ borderRadius: 12 }}>
                                    <Skeleton active />
                                </Card>
                            ))}
                        </div>
                    ) : audios.length > 0 ? (
                        <>
                            {/* 如果选择了分类且有分组数据，显示按二级学科分组 */}
                            {selectedCategory && Object.keys(groupedAudios).length > 0 ? (
                                <GroupedAudioDisplay 
                                    groupedAudios={groupedAudios}
                                    onPlay={(audio) => {
                                        // 播放音频逻辑
                                        console.log('播放音频:', audio.title);
                                    }}
                                    onView={(audioId) => {
                                        router.push(`/audio/${audioId}`);
                                    }}
                                />
                            ) : (
                                <>
                                    <AudioGrid audios={audios} />
                                    <Pagination pagination={pagination} onPageChange={handlePageChange} />
                                </>
                            )}
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