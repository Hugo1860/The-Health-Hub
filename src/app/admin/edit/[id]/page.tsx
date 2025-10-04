'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Select, 
  Space,
  Typography,
  Row,
  Col,
  Spin,
  Tooltip,
  App,
  Avatar,
  Tag
} from 'antd';
import { 
  PlayCircleOutlined, 
  PauseCircleOutlined, 
  EditOutlined, 
  ReloadOutlined,
  ArrowLeftOutlined,
  SoundOutlined,
  SaveOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '@/components/AntdAdminLayout';
import { AntdAdminGuard } from '@/components/AntdAdminGuard';
import CoverImageUpload from '@/components/admin/CoverImageUpload';
import { CategorySelector } from '@/components/CategorySelector';
import { CategoryBreadcrumb } from '@/components/CategoryBreadcrumb';
import { CategoriesProvider, useCategories } from '@/contexts/CategoriesContextNew';
import { CategorySelection } from '@/types/category';
import SafeTimeDisplay from '@/components/SafeTimeDisplay';

const { Title, Text } = Typography;
const { TextArea } = Input;

interface AudioFile {
  id: string;
  title: string;
  description?: string;
  url: string;
  filename: string;
  uploadDate: string;
  subject?: string;
  tags?: string[];
  speaker?: string;
  recordingDate?: string;
  duration?: number;
  filesize?: number;
  coverImage?: string;
  status?: string;
  categoryId?: string;
  subcategoryId?: string;
  category?: {
    id: string;
    name: string;
    color?: string;
    icon?: string;
  };
  subcategory?: {
    id: string;
    name: string;
  };
}

function EditAudioContent() {
  const { message } = App.useApp();
  const { id } = useParams();
  const router = useRouter();
  const { data: session, status } = useSession();
  const [form] = Form.useForm();

  const [audio, setAudio] = useState<AudioFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [categorySelection, setCategorySelection] = useState<CategorySelection>({});
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string>('');

  // 音频播放器状态
  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  // 使用增强的分类上下文
  const { 
    categories, 
    loading: loadingCategories, 
    refreshCategories 
  } = useCategories();

  // 检查用户权限
  const isAdmin = session?.user && ['admin', 'moderator', 'editor'].includes((session.user as any).role);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user || !isAdmin) {
      router.push('/');
      return;
    }

    fetchAudio();
    refreshCategories();
  }, [id, session, status, router, isAdmin, refreshCategories]);

  // 页面获得焦点时刷新分类数据
  useEffect(() => {
    const handleFocus = () => {
      refreshCategories();
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        refreshCategories();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refreshCategories]);

  useEffect(() => {
    if (audio?.url) {
      const audioElement = new Audio(audio.url);
      setAudioPlayer(audioElement);

      const handleLoadedMetadata = () => {
        setDuration(audioElement.duration);
      };

      const handleTimeUpdate = () => {
        setCurrentTime(audioElement.currentTime);
      };

      const handleEnded = () => {
        setIsPlaying(false);
      };

      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.addEventListener('timeupdate', handleTimeUpdate);
      audioElement.addEventListener('ended', handleEnded);

      return () => {
        audioElement.pause();
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('timeupdate', handleTimeUpdate);
        audioElement.removeEventListener('ended', handleEnded);
        audioElement.src = '';
      };
    }
  }, [audio]);

  const fetchAudio = async () => {
    try {
      const response = await fetch(`/api/admin/simple-audio/${id}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error('获取音频信息失败');
      }
      
      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || '获取音频信息失败');
      }
      
      const audioData = data.audio;
      setAudio(audioData);
      setCurrentCoverUrl(audioData.coverImage || '');
      
      // 设置分类选择
      setCategorySelection({
        categoryId: audioData.categoryId || '',
        subcategoryId: audioData.subcategoryId || ''
      });
      
      // 设置表单值
      form.setFieldsValue({
        title: audioData.title,
        description: audioData.description || '',
        speaker: audioData.speaker || '',
        status: audioData.status || 'published',
        tags: audioData.tags || []
      });
      
    } catch (error) {
      console.error('获取音频信息失败:', error);
      message.error('获取音频信息失败');
    } finally {
      setLoading(false);
    }
  };

  const togglePlayPause = () => {
    if (!audioPlayer) return;

    if (isPlaying) {
      audioPlayer.pause();
      setIsPlaying(false);
    } else {
      audioPlayer.play();
      setIsPlaying(true);
    }
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleCoverImageChange = (file: File | null, previewUrl?: string) => {
    setCoverImageFile(file);
  };

  const handleSubmit = async (values: any) => {
    setUpdating(true);
    
    try {
      let coverImageUrl = currentCoverUrl;
      
      // 处理封面图片上传
      if (coverImageFile) {
        const formData = new FormData();
        formData.append('coverImage', coverImageFile);
        
        try {
          // 获取 CSRF token
          const csrfResponse = await fetch('/api/csrf-token');
          const csrfData = await csrfResponse.json();
          
          const uploadResponse = await fetch('/api/upload-cover', {
            method: 'POST',
            credentials: 'include',
            headers: {
              'X-CSRF-Token': csrfData.token,
            },
            body: formData,
          });
          
          if (uploadResponse.ok) {
            const uploadResult = await uploadResponse.json();
            if (uploadResult.success && uploadResult.data) {
              coverImageUrl = uploadResult.data.url;
            }
          }
        } catch (uploadError) {
          console.error('封面图片上传失败:', uploadError);
          message.warning('封面图片上传失败，将保持原有图片');
        }
      }
      
      const updateData = {
        title: values.title,
        description: values.description || '',
        speaker: values.speaker || '',
        status: values.status || 'published',
        tags: values.tags || [],
        coverImage: coverImageUrl,
        categoryId: categorySelection.categoryId,
        subcategoryId: categorySelection.subcategoryId
      };

      const response = await fetch(`/api/admin/simple-audio/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
        credentials: 'include'
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          message.success('音频更新成功！');
          // 重新获取数据以更新显示
          fetchAudio();
        } else {
          message.error(result.error?.message || '更新失败');
        }
      } else {
        const error = await response.json();
        message.error(error.error?.message || error.message || '更新失败');
      }
    } catch (error) {
      console.error('更新失败:', error);
      message.error('更新失败，请稍后重试');
    } finally {
      setUpdating(false);
    }
  };



  if (status === 'loading' || loading) {
    return (
      <AntdAdminLayout>
        <Card size="small" style={{ margin: 0 }}>
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>加载中...</div>
          </div>
        </Card>
      </AntdAdminLayout>
    );
  }

  if (!session?.user || !isAdmin) {
    return (
      <AntdAdminLayout>
        <Card size="small" style={{ margin: 0 }}>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#ff4d4f' }}>
            您没有权限访问此页面
          </div>
        </Card>
      </AntdAdminLayout>
    );
  }

  if (!audio) {
    return (
      <AntdAdminLayout>
        <Card size="small" style={{ margin: 0 }}>
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#ff4d4f' }}>
            音频不存在
          </div>
        </Card>
      </AntdAdminLayout>
    );
  }

  return (
    <AntdAdminLayout>
      <Row gutter={16}>
        {/* 主编辑区域 */}
        <Col xs={24} lg={16}>
          <Card size="small" style={{ margin: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <Title level={3} style={{ margin: 0, fontSize: '18px' }}>
                <EditOutlined style={{ marginRight: 8 }} />
                编辑音频
              </Title>
              <Button 
                icon={<ArrowLeftOutlined />} 
                onClick={() => router.back()}
                size="small"
              >
                返回
              </Button>
            </div>
            
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              style={{ maxWidth: '100%' }}
            >
              {/* 1. 音频标题 */}
              <Form.Item
                name="title"
                label="1. 音频标题"
                rules={[
                  { required: true, message: '请输入音频标题' },
                  { max: 200, message: '标题不能超过200个字符' }
                ]}
                style={{ marginBottom: 16 }}
              >
                <Input placeholder="请输入音频标题" />
              </Form.Item>

              {/* 2. 音频描述 */}
              <Form.Item
                name="description"
                label="2. 音频描述"
                rules={[{ max: 1000, message: '描述不能超过1000个字符' }]}
                style={{ marginBottom: 16 }}
              >
                <TextArea 
                  rows={4} 
                  placeholder="请输入音频描述（可选）"
                  showCount
                  maxLength={1000}
                />
              </Form.Item>

              {/* 3. 封面和演讲者 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={12} md={16} lg={16} xl={16}>
                  <Form.Item
                    name="speaker"
                    label="3. 演讲者"
                    rules={[{ max: 100, message: '演讲者姓名不能超过100个字符' }]}
                    style={{ marginBottom: 0 }}
                  >
                    <Input placeholder="演讲者姓名（可选）" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12} md={8} lg={8} xl={8}>
                  <Form.Item label="封面图片" style={{ marginBottom: 0 }}>
                    <CoverImageUpload
                      onChange={handleCoverImageChange}
                      disabled={updating}
                      compact={true}
                      initialImageUrl={currentCoverUrl}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* 4. 分类选择 */}
              <Card size="small" title="4. 分类设置" style={{ marginBottom: 12, backgroundColor: '#fafafa' }}>
                <Form.Item
                  label={
                    <Space size="small">
                      <span style={{ fontSize: 12 }}>分类选择</span>
                      <Tooltip title="刷新分类列表">
                        <Button
                          type="text"
                          size="small"
                          icon={<ReloadOutlined />}
                          loading={loadingCategories}
                          onClick={refreshCategories}
                          style={{ padding: '0 2px', fontSize: 10 }}
                        />
                      </Tooltip>
                    </Space>
                  }
                  rules={[
                    {
                      validator: () => {
                        if (!categorySelection.categoryId) {
                          return Promise.reject(new Error('请选择分类'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                  style={{ marginBottom: 8 }}
                >
                  <CategorySelector
                    value={categorySelection}
                    onChange={setCategorySelection}
                    level="both"
                    allowEmpty={false}
                    loading={loadingCategories}
                    placeholder={{
                      category: '请选择一级分类',
                      subcategory: '请选择二级分类（可选）'
                    }}
                  />
                </Form.Item>

                {/* 分类路径预览 */}
                {(categorySelection.categoryId || categorySelection.subcategoryId) && (
                  <div style={{ 
                    marginTop: 8, 
                    padding: 6, 
                    backgroundColor: '#e6f7ff', 
                    borderRadius: 4,
                    fontSize: 12
                  }}>
                    <div style={{ color: '#666', marginBottom: 2, fontSize: 10 }}>分类路径：</div>
                    <CategoryBreadcrumb
                      categoryId={categorySelection.categoryId}
                      subcategoryId={categorySelection.subcategoryId}
                      showHome={false}
                    />
                  </div>
                )}
              </Card>

              {/* 5. 标签和状态 */}
              <Row gutter={16} style={{ marginBottom: 16 }}>
                <Col xs={24} sm={16} md={18} lg={18} xl={18}>
                  <Form.Item
                    name="tags"
                    label="5. 标签"
                    rules={[
                      {
                        validator: (_, value) => {
                          // 确保 value 是数组
                          if (!value) return Promise.resolve();
                          
                          // 如果不是数组，尝试转换
                          const tagsArray = Array.isArray(value) ? value : [];
                          
                          if (tagsArray.length > 10) {
                            return Promise.reject(new Error('标签数量不能超过10个'));
                          }
                          if (tagsArray.some((tag: string) => tag && tag.length > 50)) {
                            return Promise.reject(new Error('单个标签不能超过50个字符'));
                          }
                          return Promise.resolve();
                        }
                      }
                    ]}
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      mode="tags"
                      placeholder="输入标签，按回车添加（可选）"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={8} md={6} lg={6} xl={6}>
                  <Form.Item
                    name="status"
                    label="发布状态"
                    style={{ marginBottom: 0 }}
                  >
                    <Select>
                      <Select.Option value="draft">草稿</Select.Option>
                      <Select.Option value="published">已发布</Select.Option>
                      <Select.Option value="archived">已归档</Select.Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>

              {/* 操作按钮 */}
              <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
                <Space size="small">
                  <Button 
                    type="primary" 
                    htmlType="submit" 
                    loading={updating}
                    icon={<SaveOutlined />}
                    size="small"
                  >
                    {updating ? '保存中...' : '保存更改'}
                  </Button>
                  <Button 
                    size="small"
                    onClick={() => router.back()}
                  >
                    取消
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* 音频预览区域 */}
        <Col xs={24} lg={8}>
          <Card size="small" title="音频预览" style={{ margin: 0 }}>
            {/* 音频信息卡片 */}
            <div style={{ marginBottom: 16 }}>
              <Space>
                <Avatar 
                  src={currentCoverUrl || audio.coverImage || undefined}
                  icon={<SoundOutlined />}
                  size={64}
                  shape="square"
                />
                <div>
                  <div style={{ fontWeight: 500, marginBottom: 4 }}>
                    {audio.title}
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {audio.speaker && `${audio.speaker} • `}
                    {formatTime(audio.duration || 0)} • {formatFileSize(audio.filesize)}
                  </Text>
                  <div style={{ marginTop: 4 }}>
                    <SafeTimeDisplay timestamp={audio.uploadDate} format="datetime" />
                  </div>
                </div>
              </Space>
            </div>

            {/* 分类信息 */}
            {audio.category && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>分类：</Text>
                <div style={{ marginTop: 4 }}>
                  <Tag color="blue">
                    {audio.category.icon && <span>{audio.category.icon} </span>}
                    {audio.category.name}
                  </Tag>
                  {audio.subcategory && (
                    <Tag color="green">
                      {audio.subcategory.name}
                    </Tag>
                  )}
                </div>
              </div>
            )}

            {/* 音频播放器 */}
            {audioPlayer && (
              <div style={{ 
                padding: 12, 
                backgroundColor: '#f5f5f5', 
                borderRadius: 6,
                marginBottom: 16
              }}>
                <Button
                  onClick={togglePlayPause}
                  type="primary"
                  block
                  icon={isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                  style={{ marginBottom: 8 }}
                >
                  {isPlaying ? '暂停' : '播放'}
                </Button>

                <div style={{ textAlign: 'center', fontSize: 12, marginBottom: 8 }}>
                  {formatTime(currentTime)} / {formatTime(duration)}
                </div>

                <input
                  type="range"
                  min="0"
                  max="100"
                  value={duration ? (currentTime / duration) * 100 : 0}
                  onChange={(e) => {
                    if (!audioPlayer) return;
                    const newTime = (parseFloat(e.target.value) / 100) * duration;
                    audioPlayer.currentTime = newTime;
                    setCurrentTime(newTime);
                  }}
                  style={{ width: '100%' }}
                />
              </div>
            )}

            {/* 文件信息 */}
            <div style={{ fontSize: 12, color: '#666' }}>
              <div>文件名：{audio.filename}</div>
              <div>格式：{audio.filename.split('.').pop()?.toUpperCase()}</div>
              {audio.filesize && <div>大小：{formatFileSize(audio.filesize)}</div>}
            </div>
          </Card>
        </Col>
      </Row>
    </AntdAdminLayout>
  );
}
export
 default function EditAudioPage() {
  return (
    <AntdAdminGuard>
      <CategoriesProvider>
        <EditAudioContent />
      </CategoriesProvider>
    </AntdAdminGuard>
  );
}