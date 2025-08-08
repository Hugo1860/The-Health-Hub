'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Table, 
  Card, 
  Button, 
  Space, 
  Tag, 
  Typography,
  Row,
  Col,
  Statistic,
  Input,
  Select,
  Image,
  Popconfirm,
  message
} from 'antd';
import {
  SoundOutlined,
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  TagOutlined,
  CalendarOutlined,
  UserOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';

interface AudioFile {
  id: string;
  title: string;
  description: string;
  url: string;
  filename: string;
  uploadDate: string;
  subject: string;
  tags: string[];
  speaker?: string;
  recordingDate?: string;
  duration?: number;
  transcription?: string;
  coverImage?: string;
}

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

const { Title, Text } = Typography;
const { Search } = Input;

export const dynamic = 'force-dynamic';

export default function ResourcesManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [audios, setAudios] = useState<AudioFile[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      router.push('/');
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      console.log('Fetching categories and audios...');
      
      // 获取分类
      const categoriesResponse = await fetch('/api/admin/simple-categories', {
        credentials: 'include'
      });
      
      if (categoriesResponse.ok) {
        const categoriesResult = await categoriesResponse.json();
        console.log('Categories response:', categoriesResult);
        const categoriesData = categoriesResult.success ? categoriesResult.data : categoriesResult;
        setCategories(Array.isArray(categoriesData) ? categoriesData : []);
      } else {
        console.error('Failed to fetch categories:', categoriesResponse.status);
        message.error('获取分类失败');
      }

      // 获取音频列表
      const audiosResponse = await fetch('/api/admin/simple-audio', {
        credentials: 'include'
      });
      
      if (audiosResponse.ok) {
        const audiosResult = await audiosResponse.json();
        console.log('Audios response:', audiosResult);
        
        // 处理不同的响应格式
        let audioData = [];
        if (audiosResult.data && Array.isArray(audiosResult.data)) {
          audioData = audiosResult.data;
        } else if (Array.isArray(audiosResult)) {
          audioData = audiosResult;
        } else if (audiosResult.audioList && Array.isArray(audiosResult.audioList)) {
          audioData = audiosResult.audioList;
        }
        
        // 处理音频数据
        const processedAudioData = audioData.map(audio => ({
          ...audio,
          tags: typeof audio.tags === 'string' ? JSON.parse(audio.tags || '[]') : (audio.tags || []),
          uploadDate: audio.uploadDate || new Date().toISOString(),
          subject: audio.subject || '未分类',
          speaker: audio.speaker || '',
          duration: audio.duration || 0
        }));
        
        console.log('Processed audios:', processedAudioData);
        setAudios(processedAudioData);
      } else {
        console.error('Failed to fetch audios:', audiosResponse.status);
        message.error('获取音频列表失败');
      }
    } catch (error) {
      console.error('获取数据失败:', error);
      message.error('获取数据失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAudio = async (audioId: string) => {
    try {
      const response = await fetch(`/api/admin/simple-audio/${audioId}`, {
        method: 'DELETE',
        credentials: 'include'
      });

      if (response.ok) {
        message.success('删除成功');
        setAudios(audios.filter(a => a.id !== audioId));
      } else {
        const error = await response.json();
        message.error(error.error || '删除音频失败');
      }
    } catch (error) {
      console.error('删除音频失败:', error);
      message.error('删除音频失败');
    }
  };

  const getCategoryInfo = (categoryName: string) => {
    return categories.find(cat => cat.name === categoryName) || {
      id: categoryName,
      name: categoryName,
      color: '#6b7280',
      icon: '📚'
    };
  };

  // 过滤音频
  const filteredAudios = audios.filter(audio => {
    const matchesCategory = !selectedCategory || audio.subject === selectedCategory;
    const matchesSearch = !searchTerm || 
      audio.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audio.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      audio.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesCategory && matchesSearch;
  });

  // 按分类分组音频
  const audiosByCategory = categories.reduce((acc, category) => {
    const categoryAudios = filteredAudios.filter(audio => audio.subject === category.name);
    if (categoryAudios.length > 0) {
      acc[category.name] = categoryAudios;
    }
    return acc;
  }, {} as Record<string, AudioFile[]>);

  if (status === 'loading' || loading) {
    return (
      <AntdAdminLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </AntdAdminLayout>
    );
  }

  if (!session?.user || (session.user as any).role !== 'admin') {
    return null;
  }

  // 表格列定义
  const columns = [
    {
      title: '音频信息',
      dataIndex: 'title',
      key: 'title',
      width: 400,
      render: (text: string, record: AudioFile) => (
        <Space>
          <div style={{ width: 60, height: 60, borderRadius: 8, overflow: 'hidden' }}>
            {record.coverImage ? (
              <Image
                src={record.coverImage}
                alt={record.title}
                width={60}
                height={60}
                style={{ objectFit: 'cover' }}
                fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAMIAAADDCAYAAADQvc6UAAABRWlDQ1BJQ0MgUHJvZmlsZQAAKJFjYGASSSwoyGFhYGDIzSspCnJ3UoiIjFJgf8LAwSDCIMogwMCcmFxc4BgQ4ANUwgCjUcG3awyMIPqyLsis7PPOq3QdDFcvjV3jOD1boQVTPQrgSkktTgbSf4A4LbmgqISBgTEFyFYuLykAsTuAbJEioKOA7DkgdjqEvQHEToKwj4DVhAQ5A9k3gGyB5IxEoBmML4BsnSQk8XQkNtReEOBxcfXxUQg1Mjc0dyHgXNJBSWpFCYh2zi+oLMpMzyhRcASGUqqCZ16yno6CkYGRAQMDKMwhqj/fAIcloxgHQqxAjIHBEugw5sUIsSQpBobtQPdLciLEVJYzMPBHMDBsayhILEqEO4DxG0txmrERhM29nYGBddr//5/DGRjYNRkY/l7////39v///y4Dmn+LgeHANwDrkl1AuO+pmgAAADhlWElmTU0AKgAAAAgAAYdpAAQAAAABAAAAGgAAAAAAAqACAAQAAAABAAAAwqADAAQAAAABAAAAwwAAAAD9b/HnAAAHlklEQVR4Ae3dP3Ik1RnG4W+FgYxN"
              />
            ) : (
              <div style={{ 
                width: 60, 
                height: 60, 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                🎵
              </div>
            )}
          </div>
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>{text}</div>
            {record.description && (
              <div style={{ fontSize: '12px', color: '#666', marginBottom: 4 }}>
                {record.description.length > 50 
                  ? record.description.substring(0, 50) + '...' 
                  : record.description}
              </div>
            )}
            <Space size="small">
              <Tag color="blue">{record.subject}</Tag>
              {record.speaker && (
                <Tag icon={<UserOutlined />} color="green">
                  {record.speaker}
                </Tag>
              )}
            </Space>
          </div>
        </Space>
      ),
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 200,
      render: (tags: string[]) => (
        <Space wrap>
          {tags.slice(0, 3).map((tag, index) => (
            <Tag key={index} color="default">
              {tag}
            </Tag>
          ))}
          {tags.length > 3 && (
            <Tag color="default">
              +{tags.length - 3}
            </Tag>
          )}
        </Space>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
      width: 120,
      render: (date: string) => (
        <Space>
          <CalendarOutlined />
          {new Date(date).toLocaleDateString('zh-CN')}
        </Space>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      width: 200,
      render: (_: any, record: AudioFile) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            size="small"
            onClick={() => window.open(`/audio/${record.id}`, '_blank')}
          >
            预览
          </Button>
          <Button
            type="link"
            icon={<EditOutlined />}
            size="small"
            onClick={() => router.push(`/admin/edit/${record.id}`)}
          >
            编辑
          </Button>
          <Popconfirm
            title="确定要删除这个音频吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDeleteAudio(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />} size="small">
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  // 统计数据
  const stats = {
    total: audios.length,
    categories: categories.length,
    filtered: filteredAudios.length,
    thisMonth: audios.filter(a => {
      const uploadDate = new Date(a.uploadDate);
      const now = new Date();
      return uploadDate.getMonth() === now.getMonth() && uploadDate.getFullYear() === now.getFullYear();
    }).length,
  };

  return (
    <AntdAdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col span={6}>
            <Card>
              <Statistic
                title="音频总数"
                value={stats.total}
                prefix={<SoundOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="分类数量"
                value={stats.categories}
                prefix={<TagOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="筛选结果"
                value={stats.filtered}
                prefix={<FilterOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="本月新增"
                value={stats.thisMonth}
                prefix={<CalendarOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 音频资源管理表格 */}
        <Card
          title="音频资源管理"
          extra={
            <Space>
              <Search
                placeholder="搜索音频标题、描述或标签"
                allowClear
                style={{ width: 300 }}
                onSearch={setSearchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <Select
                placeholder="选择分类"
                allowClear
                style={{ width: 150 }}
                value={selectedCategory || undefined}
                onChange={setSelectedCategory}
              >
                {categories.map((category) => (
                  <Select.Option key={category.id} value={category.name}>
                    {category.icon} {category.name}
                  </Select.Option>
                ))}
              </Select>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => router.push('/admin/upload')}
              >
                添加音频
              </Button>
            </Space>
          }
        >
          <Table
            columns={columns}
            dataSource={filteredAudios}
            loading={loading}
            rowKey="id"
            pagination={{
              total: filteredAudios.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
            scroll={{ x: 1000 }}
          />
        </Card>
      </Space>
    </AntdAdminLayout>
  );
}

