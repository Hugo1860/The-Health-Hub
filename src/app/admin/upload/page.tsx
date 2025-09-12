'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Upload, 
  Select, 
  Space,
  Typography,
  Row,
  Col,
  Spin,
  Tooltip,
  App
} from 'antd';
import { UploadOutlined, InboxOutlined, ReloadOutlined } from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import CoverImageUpload from '../../../components/admin/CoverImageUpload';
import { CategorySelector } from '../../../components/CategorySelector';
import { CategoryBreadcrumb } from '../../../components/CategoryBreadcrumb';
import { CategoriesProvider, useCategories } from '../../../contexts/CategoriesContextNew';
import { CategorySelection } from '@/types/category';
import styles from '../../../styles/compact-upload.module.css';

const { Title } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

function AntdUploadPageContent() {
  const { message } = App.useApp();
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [categorySelection, setCategorySelection] = useState<CategorySelection>({});
  
  // 使用增强的分类上下文
  const { 
    categories, 
    loading: loadingCategories, 
    getCategoryOptions, 
    refreshCategories,
    getCategoryPath 
  } = useCategories();

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



  const handleSubmit = async (values: any) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      
      // 添加音频文件
      if (values.audioFile && values.audioFile.length > 0) {
        const audioFile = values.audioFile[0];
        
        if (audioFile && audioFile.originFileObj) {
          formData.append('audioFile', audioFile.originFileObj);
        } else if (audioFile && audioFile.file) {
          formData.append('audioFile', audioFile.file);
        } else if (audioFile instanceof File) {
          formData.append('audioFile', audioFile);
        } else {
          message.error('请选择有效的音频文件');
          setUploading(false);
          return;
        }
      } else {
        message.error('请选择音频文件');
        setUploading(false);
        return;
      }
      
      // 添加封面图片
      if (coverImageFile) {
        formData.append('coverImage', coverImageFile);
      }
      
      // 添加其他字段（增强版，支持分类层级）
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('speaker', values.speaker || '');
      formData.append('tags', JSON.stringify(values.tags || []));
      formData.append('status', values.status || 'published');
      
      // 新的分类字段
      if (categorySelection.categoryId) {
        formData.append('categoryId', categorySelection.categoryId);
      }
      if (categorySelection.subcategoryId) {
        formData.append('subcategoryId', categorySelection.subcategoryId);
      }
      
      // 兼容模式已移除 - 仅使用新的分类层级字段
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          message.success('音频上传成功！');
          form.resetFields();
          setCoverImageFile(null);
          setCategorySelection({});
        } else {
          message.error(result.error?.message || '上传失败');
        }
      } else {
        const error = await response.json();
        message.error(error.error?.message || error.message || '上传失败');
      }
    } catch (error) {
      console.error('上传失败:', error);
      message.error('上传失败，请稍后重试');
    } finally {
      setUploading(false);
    }
  };

  const uploadProps = {
    name: 'audioFile',
    multiple: false,
    accept: '.mp3,.wav,.m4a,.aac',
    beforeUpload: () => false, // 阻止自动上传
    onChange: (info: any) => {
      const { file } = info;
      if (file && file.name) {
        // 自动填充标题（去掉扩展名）
        const titleFromFile = file.name.replace(/\.[^/.]+$/, '');
        form.setFieldsValue({ title: titleFromFile });
        message.success(`已选择文件: ${file.name}`);
      }
    },
  };

  const handleCoverImageChange = (file: File | null, previewUrl?: string) => {
    setCoverImageFile(file);
  };

  return (
    <AntdAdminLayout>
      <Card size="small" style={{ margin: 0 }}>
        <Title level={3} style={{ margin: '0 0 16px 0', fontSize: '18px' }}>上传音频</Title>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: '100%' }}
          className={styles.compactForm}
        >
          {/* 第一步：音频文件上传 */}
          <Form.Item
            name="audioFile"
            label="1. 选择音频文件"
            rules={[{ required: true, message: '请选择音频文件' }]}
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e && e.fileList;
            }}
            style={{ marginBottom: 24 }}
          >
            <Dragger {...uploadProps} style={{ padding: '20px 16px' }}>
              <p className="ant-upload-drag-icon" style={{ margin: '8px 0' }}>
                <InboxOutlined style={{ fontSize: 32 }} />
              </p>
              <p className="ant-upload-text" style={{ margin: '4px 0', fontSize: 14 }}>
                点击或拖拽文件到此区域上传
              </p>
              <p className="ant-upload-hint" style={{ margin: '4px 0', fontSize: 12 }}>
                支持 MP3、WAV、M4A、AAC 格式，选择文件后标题会自动填充
              </p>
            </Dragger>
          </Form.Item>

          {/* 第二步：音频标题 */}
          <Form.Item
            name="title"
            label="2. 音频标题"
            rules={[
              { required: true, message: '请输入音频标题' },
              { max: 200, message: '标题不能超过200个字符' }
            ]}
            style={{ marginBottom: 16 }}
          >
            <Input placeholder="标题会自动从文件名填充，您可以修改" />
          </Form.Item>

          {/* 第三步：音频描述 */}
          <Form.Item
            name="description"
            label="3. 音频描述"
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

          {/* 第四步：封面和演讲者 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={12} md={16} lg={16} xl={16}>
              <Form.Item
                name="speaker"
                label="4. 演讲者"
                rules={[{ max: 100, message: '演讲者姓名不能超过100个字符' }]}
                style={{ marginBottom: 0 }}
              >
                <Input placeholder="演讲者姓名（可选）" />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12} md={8} lg={8} xl={8}>
              <Form.Item label="封面图片" style={{ marginBottom: 0 }}>
                <div className="cover-upload-container">
                  <CoverImageUpload
                    onChange={handleCoverImageChange}
                    disabled={uploading}
                    compact={true}
                  />
                </div>
              </Form.Item>
            </Col>
          </Row>

          {/* 第五步：分类选择 */}
          <Card size="small" title="5. 分类设置" style={{ marginBottom: 12, backgroundColor: '#fafafa' }}>
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

            {/* 分类路径预览 - 紧凑样式 */}
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

          {/* 第六步：标签和状态 */}
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col xs={24} sm={16} md={18} lg={18} xl={18}>
              <Form.Item
                name="tags"
                label="6. 标签"
                rules={[
                  {
                    validator: (_, value) => {
                      if (value && value.length > 10) {
                        return Promise.reject(new Error('标签数量不能超过10个'));
                      }
                      if (value && value.some((tag: string) => tag.length > 50)) {
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
                initialValue="published"
                style={{ marginBottom: 0 }}
              >
                <Select>
                  <Select.Option value="draft">草稿</Select.Option>
                  <Select.Option value="published">已发布</Select.Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* 操作按钮 - 紧凑布局 */}
          <Form.Item style={{ marginBottom: 0, marginTop: 8 }}>
            <Space size="small">
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={uploading}
                icon={<UploadOutlined />}
                size="small"
              >
                {uploading ? '上传中...' : '上传音频'}
              </Button>
              <Button 
                size="small"
                onClick={() => {
                  form.resetFields();
                  setCoverImageFile(null);
                  setCategorySelection({});
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </AntdAdminLayout>
  );
}

export default function AntdUploadPage() {
  return (
    <CategoriesProvider>
      <AntdUploadPageContent />
    </CategoriesProvider>
  );
}