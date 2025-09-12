'use client';

import { useState } from 'react';
import { Button, Form, Input, Select, Upload, message, Card } from 'antd';
import { UploadOutlined } from '@ant-design/icons';

export default function TestUploadPage() {
  const [form] = Form.useForm();
  const [uploading, setUploading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleUpload = async (values: any) => {
    setUploading(true);
    setLogs([]);
    
    try {
      addLog('开始上传...');
      
      // 检查认证状态
      addLog('检查认证状态...');
      const sessionResponse = await fetch('/api/check-session', {
        credentials: 'include'
      });
      const sessionData = await sessionResponse.json();
      addLog(`认证状态: ${JSON.stringify(sessionData)}`);
      
      if (!sessionData.user) {
        addLog('用户未登录');
        message.error('请先登录');
        return;
      }
      
      if (sessionData.user.role !== 'admin') {
        addLog('用户不是管理员');
        message.error('需要管理员权限');
        return;
      }
      
      addLog('准备FormData...');
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('subject', values.subject);
      formData.append('tags', JSON.stringify(values.tags || []));
      formData.append('speaker', values.speaker || '');
      
      if (values.audio && values.audio[0]) {
        const audioFile = values.audio[0].originFileObj;
        addLog(`音频文件: ${audioFile.name}, ${audioFile.type}, ${audioFile.size} bytes`);
        formData.append('audio', audioFile);
      } else {
        addLog('没有找到音频文件');
        message.error('请选择音频文件');
        return;
      }
      
      addLog('发送上传请求...');
      const response = await fetch('/api/admin/simple-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      
      addLog(`响应状态: ${response.status}`);
      addLog(`响应头: ${JSON.stringify(Object.fromEntries(response.headers.entries()))}`);
      
      const responseText = await response.text();
      addLog(`原始响应: ${responseText}`);
      
      let data;
      try {
        data = JSON.parse(responseText);
        addLog(`解析后的响应: ${JSON.stringify(data, null, 2)}`);
      } catch (e) {
        addLog(`JSON解析失败: ${e}`);
        data = { error: '响应格式错误', raw: responseText };
      }
      
      if (response.ok && data.success) {
        message.success('上传成功');
        form.resetFields();
        addLog('上传完成');
      } else {
        const errorMessage = data?.error || data?.message || `HTTP ${response.status} 错误`;
        message.error(`上传失败: ${errorMessage}`);
        addLog(`上传失败: ${errorMessage}`);
      }
      
    } catch (error) {
      addLog(`异常: ${error}`);
      message.error('上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="container mx-auto p-4">
      <Card title="音频上传测试" className="mb-4">
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
            <Input.TextArea placeholder="请输入音频描述" rows={3} />
          </Form.Item>

          <Form.Item
            name="subject"
            label="分类"
            rules={[{ required: true, message: '请选择分类' }]}
          >
            <Select placeholder="请选择分类">
              <Select.Option value="心血管">心血管</Select.Option>
              <Select.Option value="神经科">神经科</Select.Option>
              <Select.Option value="肿瘤科">肿瘤科</Select.Option>
              <Select.Option value="外科">外科</Select.Option>
              <Select.Option value="儿科">儿科</Select.Option>
              <Select.Option value="其他">其他</Select.Option>
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
            >
              上传测试
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title="上传日志">
        <div className="bg-gray-100 p-4 rounded max-h-96 overflow-y-auto">
          {logs.map((log, index) => (
            <div key={index} className="text-sm font-mono mb-1">
              {log}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}