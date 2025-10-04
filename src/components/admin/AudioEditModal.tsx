'use client';

import React, { useEffect, useState } from 'react';
import {
  Modal,
  Form,
  Input,
  Select,
  Button,
  Space,
  message,
  DatePicker,
  Row,
  Col,
  Tooltip
} from 'antd';
import { SaveOutlined, CloseOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import CoverImageUpload from './CoverImageUpload';
import { useCategories } from '../../contexts/CategoriesContext';

const { TextArea } = Input;

interface AudioItem {
  id: string;
  title: string;
  description?: string;
  subject: string;
  speaker?: string;
  tags: string[];
  coverImage?: string;
  uploadDate: string;
  duration?: number;
  size?: number;
  filename: string;
  url: string;
  recordingDate?: string;
}

interface AudioUpdateData {
  title: string;
  description?: string;
  subject: string;
  speaker?: string;
  tags: string[];
  recordingDate?: string;
  coverImage?: File | null;
}

interface AudioEditModalProps {
  visible: boolean;
  audio: AudioItem | null;
  onSave: (audioId: string, data: AudioUpdateData) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

const AudioEditModal: React.FC<AudioEditModalProps> = ({
  visible,
  audio,
  onSave,
  onCancel,
  loading = false
}) => {
  const [form] = Form.useForm();
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  
  // 使用全局分类上下文
  const { categories, loading: loadingCategories, getCategoryOptions, refreshCategories } = useCategories();

  // 当音频数据变化时，更新表单
  useEffect(() => {
    if (visible && audio) {
      form.setFieldsValue({
        title: audio.title,
        description: audio.description || '',
        subject: audio.subject,
        speaker: audio.speaker || '',
        tags: audio.tags || [],
        recordingDate: audio.recordingDate ? dayjs(audio.recordingDate) : null,
      });
    }
  }, [visible, audio, form]);

  // 重置表单
  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setCoverImageFile(null);
    }
  }, [visible, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      
      const updateData: AudioUpdateData = {
        title: values.title,
        description: values.description,
        subject: values.subject,
        speaker: values.speaker,
        tags: values.tags || [],
        recordingDate: values.recordingDate ? values.recordingDate.toISOString() : undefined,
        coverImage: coverImageFile,
      };

      if (audio) {
        await onSave(audio.id, updateData);
      }
    } catch (error) {
      console.error('表单验证失败:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    setCoverImageFile(null);
    onCancel();
  };

  const handleCoverImageChange = (file: File | null, previewUrl?: string) => {
    setCoverImageFile(file);
  };

  return (
    <Modal
      title={`编辑音频 - ${audio?.title || ''}`}
      open={visible}
      onCancel={handleCancel}
      width={800}
      footer={[
        <Button key="cancel" onClick={handleCancel} disabled={loading}>
          <CloseOutlined />
          取消
        </Button>,
        <Button
          key="save"
          type="primary"
          loading={loading}
          onClick={handleSubmit}
          icon={<SaveOutlined />}
        >
          保存
        </Button>,
      ]}
      destroyOnHidden
    >
      <Form
        form={form}
        layout="vertical"
        disabled={loading}
      >
        <Row gutter={16}>
          <Col span={24}>
            <Form.Item
              name="title"
              label="音频标题"
              rules={[
                { required: true, message: '请输入音频标题' },
                { max: 200, message: '标题不能超过200个字符' }
              ]}
            >
              <Input placeholder="请输入音频标题" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="subject"
              label={
                <Space>
                  <span>学科分类</span>
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
              rules={[{ required: true, message: '请选择学科分类' }]}
            >
              <Select
                placeholder="请选择学科分类"
                options={getCategoryOptions()}
                loading={loadingCategories}
                notFoundContent={loadingCategories ? '加载中...' : '暂无分类'}
                showSearch
                filterOption={(input, option) =>
                  (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                }
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="speaker"
              label="演讲者"
              rules={[
                { max: 100, message: '演讲者姓名不能超过100个字符' }
              ]}
            >
              <Input placeholder="请输入演讲者姓名（可选）" />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={12}>
            <Form.Item
              name="tags"
              label="标签"
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
            >
              <Select
                mode="tags"
                placeholder="请输入标签，按回车添加"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item
              name="recordingDate"
              label="录制日期"
            >
              <DatePicker
                style={{ width: '100%' }}
                placeholder="请选择录制日期（可选）"
                format="YYYY-MM-DD"
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col span={16}>
            <Form.Item
              name="description"
              label="音频描述"
              rules={[
                { max: 1000, message: '描述不能超过1000个字符' }
              ]}
            >
              <TextArea
                rows={4}
                placeholder="请输入音频描述（可选）"
                showCount
                maxLength={1000}
              />
            </Form.Item>
          </Col>
          <Col span={8}>
            <Form.Item label="封面图片">
              <CoverImageUpload
                value={audio?.coverImage}
                onChange={handleCoverImageChange}
                disabled={loading}
              />
            </Form.Item>
          </Col>
        </Row>

        {/* 显示文件信息（只读） */}
        {audio && (
          <Row gutter={16}>
            <Col span={24}>
              <div style={{ 
                background: '#f5f5f5', 
                padding: '12px', 
                borderRadius: '6px',
                marginTop: '16px'
              }}>
                <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>文件信息</div>
                <Row gutter={16}>
                  <Col span={8}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      文件名: {audio.filename}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      文件大小: {audio.size ? `${Math.round(audio.size / 1024 / 1024 * 100) / 100} MB` : '-'}
                    </div>
                  </Col>
                  <Col span={8}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      时长: {audio.duration ? `${Math.floor(audio.duration / 60)}:${Math.floor(audio.duration % 60).toString().padStart(2, '0')}` : '-'}
                    </div>
                  </Col>
                </Row>
                <Row gutter={16} style={{ marginTop: '8px' }}>
                  <Col span={12}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      上传时间: {new Date(audio.uploadDate).toLocaleString()}
                    </div>
                  </Col>
                  <Col span={12}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      音频ID: {audio.id}
                    </div>
                  </Col>
                </Row>
              </div>
            </Col>
          </Row>
        )}
      </Form>
    </Modal>
  );
};

export default AudioEditModal;