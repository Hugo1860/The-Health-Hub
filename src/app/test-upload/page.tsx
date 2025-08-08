'use client';

import React, { useState } from 'react';
import { Card, Button, Form, Input, Select, Upload, message, Typography } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

const { Title } = Typography;
const { Option } = Select;

export default function TestUploadPage() {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (values: any) => {
    setUploading(true);
    console.log('=== 开始测试上传 ===');
    console.log('表单数据:', values);

    try {
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('subject', values.subject);
      formData.append('tags', JSON.stringify(values.tags || []));
      formData.append('speaker', values.speaker || '');
      
      if (values.audio && values.audio[0]) {
        const audioFile = values.audio[0].originFileObj;
        console.log('音频文件详情:', {
          name: audioFile.name,
          type: audioFile.type,
          size: audioFile.size,
          lastModified: audioFile.lastModified
        });
        formData.append('audio', audioFile);
      } else {
        console.error('没有找到音频文件');
        message.error('请选择音频文件');
        return;
      }

      // 打印 FormData 内容
      console.log('FormData 内容:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`${key}: File(${value.name}, ${value.type}, ${value.size} bytes)`);
        } else {
          console.log(`${key}: ${value}`);
        }
      }

      console.log('发送请求到 /api/admin/simple-upload');
      const response = await fetch('/api/admin/simple-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('响应状态:', response.status);
      console.log('响应头:', Object.fromEntries(response.headers.entries()));

      const data = await response.json();
      console.log('响应数据:', data);

      if (response.ok) {
        message.success('上传成功！');
        form.resetFields();
      } else {
        console.error('上传失败:', data);
        message.error(`上传失败: ${data.error || '未知错误'}`);
      }
    } catch (error) {
      console.error('上传异常:', error);
      message.error(`上传异常: ${error instanceof Error ? error.message : '未知错误'}`);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <Title level={2}>音频上传测试</Title>
      
      <Card>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleUpload}
        >
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
            <Input.TextArea 
              placeholder="请输入音频描述" 
              rows={3}
            />
          </Form.Item>

          <Form.Item
            name="subject"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类">
              <Option value="心血管">心血管</Option>
              <Option value="神经科">神经科</Option>
              <Option value="肿瘤科">肿瘤科</Option>
              <Option value="外科">外科</Option>
              <Option value="儿科">儿科</Option>
              <Option value="其他">其他</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="speaker"
            label="演讲者"
          >
            <Input placeholder="请输入演讲者姓名" />
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

          <Form.Item
            name="audio"
            label="音频文件"
            rules={[{ required: true, message: '请选择音频文件' }]}
            valuePropName="fileList"
            getValueFromEvent={(e) => {
              if (Array.isArray(e)) {
                return e;
              }
              return e?.fileList;
            }}
          >
            <Upload
              beforeUpload={() => false}
              accept="audio/*"
              maxCount={1}
              listType="text"
            >
              <Button icon={<UploadOutlined />}>选择音频文件</Button>
            </Upload>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={uploading}
              size="large"
            >
              {uploading ? '上传中...' : '开始上传'}
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}