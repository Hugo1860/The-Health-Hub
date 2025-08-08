'use client';

import React, { useState } from 'react';
import { 
  Card, 
  Form, 
  Input, 
  Button, 
  Upload, 
  Select, 
  message,
  Space,
  Typography
} from 'antd';
import { UploadOutlined, InboxOutlined } from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';

const { Title } = Typography;
const { TextArea } = Input;
const { Dragger } = Upload;

export default function AntdUploadPage() {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);

  const handleSubmit = async (values: any) => {
    setUploading(true);
    
    try {
      const formData = new FormData();
      
      // 添加文件
      if (values.audioFile && values.audioFile.length > 0) {
        formData.append('audioFile', values.audioFile[0].originFileObj);
      }
      
      // 添加其他字段
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('subject', values.subject);
      formData.append('speaker', values.speaker || '');
      formData.append('tags', JSON.stringify(values.tags || []));
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        message.success('音频上传成功！');
        form.resetFields();
      } else {
        const error = await response.json();
        message.error(error.message || '上传失败');
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
      const { status } = info.file;
      if (status === 'done') {
        message.success(`${info.file.name} 文件上传成功`);
      } else if (status === 'error') {
        message.error(`${info.file.name} 文件上传失败`);
      }
    },
  };

  return (
    <AntdAdminLayout>
      <Card>
        <Title level={2}>上传音频</Title>
        
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          style={{ maxWidth: 800 }}
        >
          <Form.Item
            name="audioFile"
            label="音频文件"
            rules={[{ required: true, message: '请选择音频文件' }]}
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e && e.fileList;
            }}
          >
            <Dragger {...uploadProps}>
              <p className="ant-upload-drag-icon">
                <InboxOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持 MP3、WAV、M4A、AAC 格式的音频文件
              </p>
            </Dragger>
          </Form.Item>

          <Form.Item
            name="title"
            label="音频标题"
            rules={[{ required: true, message: '请输入音频标题' }]}
          >
            <Input placeholder="请输入音频标题" />
          </Form.Item>

          <Form.Item
            name="description"
            label="音频描述"
          >
            <TextArea 
              rows={4} 
              placeholder="请输入音频描述（可选）" 
            />
          </Form.Item>

          <Form.Item
            name="subject"
            label="学科分类"
            rules={[{ required: true, message: '请选择学科分类' }]}
          >
            <Select placeholder="请选择学科分类">
              <Select.Option value="心血管">心血管</Select.Option>
              <Select.Option value="神经科">神经科</Select.Option>
              <Select.Option value="内科学">内科学</Select.Option>
              <Select.Option value="外科">外科</Select.Option>
              <Select.Option value="儿科">儿科</Select.Option>
              <Select.Option value="药理学">药理学</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="speaker"
            label="演讲者"
          >
            <Input placeholder="请输入演讲者姓名（可选）" />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="请输入标签，按回车添加"
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button 
                type="primary" 
                htmlType="submit" 
                loading={uploading}
                icon={<UploadOutlined />}
              >
                {uploading ? '上传中...' : '上传音频'}
              </Button>
              <Button onClick={() => form.resetFields()}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>
    </AntdAdminLayout>
  );
}