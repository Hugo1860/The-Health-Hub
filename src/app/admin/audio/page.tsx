'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Table, 
  Button, 
  Space, 
  Tag, 
  Avatar, 
  Typography, 
  Input,
  Select,
  Modal,
  Form,
  Upload,
  message,
  Popconfirm,
  Tooltip,
  Image,
  App
} from 'antd';
import {
  SoundOutlined,
  SearchOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  ReloadOutlined,
  ExportOutlined,
  EyeOutlined,
  UploadOutlined,
  CloseOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile } from 'antd/es/upload/interface';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { AntdAdminGuard } from '../../../components/AntdAdminGuard';
import SafeTimeDisplay from '../../../components/SafeTimeDisplay';
import { CategorySelector } from '../../../components/CategorySelector';
import { CategoryBreadcrumb } from '../../../components/CategoryBreadcrumb';
import { CategoriesProvider, useCategories } from '../../../contexts/CategoriesContextNew';
import { CategorySelection } from '@/types/category';

const { Title, Text } = Typography;
const { Search } = Input;
const { Option } = Select;
const { TextArea } = Input;

interface Audio {
  id: string;
  title: string;
  description?: string;
  filename: string;
  url: string;
  coverImage?: string;
  duration?: number;
  filesize?: number;
  subject: string; // 兼容性字段
  categoryId?: string; // 新增：一级分类ID
  subcategoryId?: string; // 新增：二级分类ID
  speaker?: string;
  uploadDate: string;
  status: string;
  // 分类信息
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

function AudioManagement() {
  const { message } = App.useApp();
  const router = useRouter();
  const [audios, setAudios] = useState<Audio[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingAudio, setEditingAudio] = useState<Audio | null>(null);
  const [form] = Form.useForm();
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [coverImageList, setCoverImageList] = useState<UploadFile[]>([]);
  const [categorySelection, setCategorySelection] = useState<CategorySelection>({});

  // 使用新的分类Context
  const { 
    categories, 
    loading: loadingCategories, 
    refreshCategories 
  } = useCategories();

  useEffect(() => {
    fetchAudios();
  }, []);

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

  const fetchAudios = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/simple-audio', {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`获取音频列表失败: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        setAudios(data.audios || []);
      } else {
        throw new Error(data.error?.message || '获取音频列表失败');
      }
    } catch (error) {
      console.error('获取音频列表失败:', error);
      message.error(error instanceof Error ? error.message : '获取音频列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchText(value);
  };

  const handleSubjectFilter = (value: string) => {
    setSelectedSubject(value);
  };

  const handleStatusFilter = (value: string) => {
    setSelectedStatus(value);
  };

  const handleEdit = (audio: Audio) => {
    setEditingAudio(audio);
    form.setFieldsValue({
      title: audio.title,
      description: audio.description,
      speaker: audio.speaker,
      status: audio.status,
    });

    // 设置分类选择
    setCategorySelection({
      categoryId: audio.categoryId,
      subcategoryId: audio.subcategoryId
    });
    
    // 设置封面图片
    if (audio.coverImage) {
      setCoverImageList([{
        uid: '-1',
        name: 'cover.jpg',
        status: 'done',
        url: audio.coverImage,
      }]);
    } else {
      setCoverImageList([]);
    }
    
    setIsModalVisible(true);
  };

  const handleDelete = async (audioId: string) => {
    try {
      const response = await fetch(`/api/admin/simple-audio/${audioId}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`删除音频失败: ${response.status}`);
      }
      
      const data = await response.json();
      if (data.success) {
        message.success('音频删除成功');
        fetchAudios();
      } else {
        throw new Error(data.error?.message || '删除音频失败');
      }
    } catch (error) {
      console.error('删除音频失败:', error);
      message.error(error instanceof Error ? error.message : '删除音频失败');
    }
  };

  const handleSubmit = async (values: any) => {
    try {
      // 表单验证已通过，直接使用传入的values
      
      if (editingAudio) {
        // 编辑模式：处理图片上传和元数据更新
        let coverImageUrl = editingAudio.coverImage || ''; // 默认使用原有图片
        
        // 检查是否有新上传的图片
        if (coverImageList.length > 0) {
          const coverImageFile = coverImageList[0];
          
          if (coverImageFile.originFileObj) {
            // 有新上传的图片，需要先上传
            console.log('上传新的封面图片...');
            const formData = new FormData();
            formData.append('coverImage', coverImageFile.originFileObj);
            
            try {
              const uploadResponse = await fetch('/api/upload-cover', {
                method: 'POST',
                credentials: 'include',
                body: formData,
              });
              
              if (uploadResponse.ok) {
                const uploadResult = await uploadResponse.json();
                if (uploadResult.success && uploadResult.data) {
                  coverImageUrl = uploadResult.data.url;
                  console.log('封面图片上传成功:', coverImageUrl);
                } else {
                  throw new Error(uploadResult.error?.message || '图片上传失败');
                }
              } else {
                throw new Error(`图片上传失败: ${uploadResponse.status}`);
              }
            } catch (uploadError) {
              console.error('图片上传失败:', uploadError);
              message.error('图片上传失败，将保持原有图片');
              // 继续使用原有图片
            }
          } else if (coverImageFile.url) {
            // 使用现有的图片URL（没有更改图片的情况）
            coverImageUrl = coverImageFile.url;
          }
        } else {
          // 没有图片，清空封面
          coverImageUrl = '';
        }
        
        const requestData = {
          ...values,
          coverImage: coverImageUrl,
          // 添加新的分类字段
          categoryId: categorySelection.categoryId,
          subcategoryId: categorySelection.subcategoryId
        };

        // 移除兼容模式处理
        
        console.log('更新音频数据:', requestData);
        
        const response = await fetch(`/api/admin/simple-audio/${editingAudio.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(requestData),
        });
        
        if (!response.ok) {
          throw new Error(`更新音频失败: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          message.success('音频更新成功');
          setIsModalVisible(false);
          setEditingAudio(null);
          form.resetFields();
          setFileList([]);
          setCoverImageList([]);
          setCategorySelection({});
          fetchAudios();
        } else {
          throw new Error(data.error?.message || '更新音频失败');
        }
      } else {
        // 新增模式：需要上传文件
        if (fileList.length === 0) {
          message.error('请选择音频文件');
          return;
        }
        
        const formData = new FormData();
        formData.append('title', values.title);
        formData.append('description', values.description || '');
        formData.append('speaker', values.speaker || '');
        formData.append('status', values.status);

        // 添加分类信息
        if (categorySelection.categoryId) {
          formData.append('categoryId', categorySelection.categoryId);
          if (categorySelection.subcategoryId) {
            formData.append('subcategoryId', categorySelection.subcategoryId);
          }
          
          // 移除兼容模式处理
        }
        
        // 添加音频文件
        const audioFile = fileList[0];
        if (audioFile.originFileObj) {
          formData.append('audioFile', audioFile.originFileObj);
        }
        
        // 添加封面图片（如果有）
        if (coverImageList.length > 0 && coverImageList[0].originFileObj) {
          formData.append('coverImage', coverImageList[0].originFileObj);
        }
        
        const response = await fetch('/api/upload-simple', {
          method: 'POST',
          credentials: 'include',
          body: formData,
        });
        
        if (!response.ok) {
          throw new Error(`上传音频失败: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.success) {
          message.success('音频上传成功');
          setIsModalVisible(false);
          setEditingAudio(null);
          form.resetFields();
          setFileList([]);
          setCoverImageList([]);
          setCategorySelection({});
          fetchAudios();
        } else {
          throw new Error(data.error?.message || '上传音频失败');
        }
      }
    } catch (error) {
      console.error('操作失败:', error);
      message.error(error instanceof Error ? error.message : '操作失败');
    }
  };

  const handleModalOk = async () => {
    try {
      // 触发表单提交，这会调用handleSubmit函数
      await form.submit();
    } catch (error) {
      console.error('表单提交失败:', error);
    }
  };

  const handleModalCancel = () => {
    setIsModalVisible(false);
    setEditingAudio(null);
    form.resetFields();
    setFileList([]);
    setCoverImageList([]);
    setCategorySelection({});
  };

  // 处理封面图片上传
  const handleCoverImageChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setCoverImageList(newFileList);
  };

  // 删除封面图片
  const handleRemoveCoverImage = (file: UploadFile) => {
    setCoverImageList(coverImageList.filter(item => item.uid !== file.uid));
    return true;
  };

  // 处理音频文件上传
  const handleAudioFileChange = ({ fileList: newFileList }: { fileList: UploadFile[] }) => {
    setFileList(newFileList);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published': return 'green';
      case 'draft': return 'orange';
      case 'archived': return 'red';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'published': return '已发布';
      case 'draft': return '草稿';
      case 'archived': return '已归档';
      default: return status;
    }
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '-';
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '-';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 过滤音频数据
  const filteredAudios = audios.filter(audio => {
    const matchesSearch = !searchText || 
      audio.title.toLowerCase().includes(searchText.toLowerCase()) ||
      audio.description?.toLowerCase().includes(searchText.toLowerCase()) ||
      audio.speaker?.toLowerCase().includes(searchText.toLowerCase());
    
    const matchesSubject = !selectedSubject || 
      audio.category?.name === selectedSubject || 
      audio.subject === selectedSubject; // 向后兼容
    const matchesStatus = !selectedStatus || audio.status === selectedStatus;
    
    return matchesSearch && matchesSubject && matchesStatus;
  });

  const columns: ColumnsType<Audio> = [
    {
      title: '音频',
      dataIndex: 'audio',
      key: 'audio',
      render: (_, record) => (
        <Space>
          <Avatar 
            src={record.coverImage}
            icon={<SoundOutlined />}
            size="large"
            shape="square"
          />
          <div>
            <div style={{ fontWeight: 500, marginBottom: 4 }}>
              {record.title}
            </div>
            <Text type="secondary" style={{ fontSize: 12 }}>
              {record.speaker && `${record.speaker} • `}
              {formatDuration(record.duration)} • {formatFileSize(record.filesize)}
            </Text>
          </div>
        </Space>
      ),
    },
    {
      title: '分类',
      dataIndex: 'category',
      key: 'category',
      render: (_, record) => {
        if (record.category) {
          return (
            <Space direction="vertical" size="small">
              <Tag color="blue">
                {record.category.icon && <span>{record.category.icon} </span>}
                {record.category.name}
              </Tag>
              {record.subcategory && (
                <Tag color="green" size="small">
                  {record.subcategory.name}
                </Tag>
              )}
            </Space>
          );
        } else if (record.subject) {
          // 向后兼容显示
          return <Tag color="orange">{record.subject}</Tag>;
        }
        return <Text type="secondary">未分类</Text>;
      },
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
    },
    {
      title: '上传时间',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
      render: (uploadDate: string) => (
        <SafeTimeDisplay timestamp={uploadDate} format="datetime" />
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Tooltip title="播放">
            <Button 
              type="text" 
              icon={<EyeOutlined />} 
              size="small"
              onClick={() => {
                // 这里可以添加播放音频的逻辑
                message.info('播放功能待开发');
              }}
            />
          </Tooltip>
          <Tooltip title="编辑">
            <Button 
              type="text" 
              icon={<EditOutlined />} 
              size="small"
              onClick={() => router.push(`/admin/edit/${record.id}`)}
            />
          </Tooltip>
          <Popconfirm
            title="确定要删除这个音频吗？"
            description="删除后无法恢复，请谨慎操作。"
            onConfirm={() => handleDelete(record.id)}
            okText="确定"
            cancelText="取消"
          >
            <Tooltip title="删除">
              <Button 
                type="text" 
                icon={<DeleteOutlined />} 
                size="small"
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <AntdAdminLayout>
      <div style={{ padding: '0 0 24px 0' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={3} style={{ margin: 0 }}>
            音频管理
          </Title>
          <Space>
            <Button 
              icon={<ExportOutlined />}
              onClick={() => message.info('导出功能待开发')}
            >
              导出
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={() => router.push('/admin/upload')}
            >
              上传音频
            </Button>
          </Space>
        </div>

        <Card>
          <div style={{ marginBottom: 16 }}>
            <Space wrap>
              <Search
                placeholder="搜索音频标题、描述或讲者"
                allowClear
                style={{ width: 300 }}
                onSearch={handleSearch}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Select
                placeholder="筛选分类"
                allowClear
                style={{ width: 150 }}
                onChange={handleSubjectFilter}
                loading={loadingCategories}
              >
                {categories.map(category => (
                  <Option key={category.id} value={category.name}>
                    {category.name}
                  </Option>
                ))}
              </Select>
              <Select
                placeholder="筛选状态"
                allowClear
                style={{ width: 120 }}
                onChange={handleStatusFilter}
              >
                <Option value="published">已发布</Option>
                <Option value="draft">草稿</Option>
                <Option value="archived">已归档</Option>
              </Select>
              <Button 
                icon={<ReloadOutlined />}
                onClick={fetchAudios}
                loading={loading}
              >
                刷新
              </Button>
            </Space>
          </div>

          <Table
            columns={columns}
            dataSource={filteredAudios}
            rowKey="id"
            loading={loading}
            pagination={{
              total: filteredAudios.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条记录`,
            }}
          />
        </Card>

        <Modal
          title={editingAudio ? '编辑音频' : '上传音频'}
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={handleModalCancel}
          width={800}
          destroyOnHidden
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            initialValues={{
              status: 'draft',
            }}
          >
            <Form.Item
              label="音频标题"
              name="title"
              rules={[{ required: true, message: '请输入音频标题' }]}
            >
              <Input placeholder="请输入音频标题" />
            </Form.Item>

            <Form.Item
              label="音频描述"
              name="description"
            >
              <TextArea 
                placeholder="请输入音频描述" 
                rows={4}
                showCount
                maxLength={500}
              />
            </Form.Item>

            <Form.Item
              label={
                <Space>
                  <span>分类选择</span>
                  <Tooltip title="刷新分类列表">
                    <Button
                      type="text"
                      size="small"
                      icon={<ReloadOutlined />}
                      loading={loadingCategories}
                      onClick={refreshCategories}
                      style={{ padding: '0 4px' }}
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
            >
              <CategorySelector
                value={categorySelection}
                onChange={setCategorySelection}
                allowEmpty={false}
              />
            </Form.Item>

            {/* 分类路径显示 */}
            {(categorySelection.categoryId || categorySelection.subcategoryId) && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary">当前分类路径：</Text>
                <CategoryBreadcrumb
                  categoryId={categorySelection.categoryId}
                  subcategoryId={categorySelection.subcategoryId}
                />
              </div>
            )}



            <Form.Item
              label="讲者"
              name="speaker"
            >
              <Input placeholder="请输入讲者姓名" />
            </Form.Item>

            <Form.Item
              label="状态"
              name="status"
              rules={[{ required: true, message: '请选择状态' }]}
            >
              <Select placeholder="请选择状态">
                <Option value="draft">草稿</Option>
                <Option value="published">已发布</Option>
                <Option value="archived">已归档</Option>
              </Select>
            </Form.Item>

            <Form.Item label="封面图片">
              <Upload
                listType="picture-card"
                fileList={coverImageList}
                onChange={handleCoverImageChange}
                onRemove={handleRemoveCoverImage}
                beforeUpload={() => false} // 阻止自动上传
                maxCount={1}
              >
                {coverImageList.length === 0 && (
                  <div>
                    <PlusOutlined />
                    <div style={{ marginTop: 8 }}>上传封面</div>
                  </div>
                )}
              </Upload>
              <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                支持 JPG、PNG 格式，建议尺寸 400x300px
              </div>
            </Form.Item>

            {!editingAudio && (
              <Form.Item
                label="音频文件"
                rules={[{ required: true, message: '请上传音频文件' }]}
              >
                <Upload
                  fileList={fileList}
                  onChange={handleAudioFileChange}
                  beforeUpload={() => false} // 阻止自动上传
                  accept=".mp3,.wav,.m4a,.aac"
                  maxCount={1}
                >
                  <Button icon={<UploadOutlined />}>选择音频文件</Button>
                </Upload>
                <div style={{ marginTop: 8, color: '#666', fontSize: 12 }}>
                  支持 MP3、WAV、M4A、AAC 格式，文件大小不超过 50MB
                </div>
              </Form.Item>
            )}
          </Form>
        </Modal>
      </div>
    </AntdAdminLayout>
  );
}

export default function AudioManagementPage() {
  return (
    <AntdAdminGuard>
      <CategoriesProvider>
        <AudioManagement />
      </CategoriesProvider>
    </AntdAdminGuard>
  );
}