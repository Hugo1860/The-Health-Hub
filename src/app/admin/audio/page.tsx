'use client';

import { useState, useEffect } from 'react';
import { 
  Table, 
  Button, 
  Space, 
  Popconfirm, 
  message, 
  Input, 
  Select, 
  Card, 
  Statistic,
  Row,
  Col,
  Tag,
  Typography,
  Modal,
  Form,
  Upload,
  Progress
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  SearchOutlined,
  SoundOutlined,
  UploadOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  ExportOutlined
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { AntdAdminGuard } from '../../../components/AntdAdminGuard';

const { Title } = Typography;
const { Search } = Input;
const { Option } = Select;

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
}

function AudioManagement() {
  const [audioList, setAudioList] = useState<AudioFile[]>([]);
  const [filteredList, setFilteredList] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [form] = Form.useForm();

  useEffect(() => {
    fetchAudioList();
  }, []);

  useEffect(() => {
    filterAudioList();
  }, [audioList, searchText, selectedSubject]);

  const fetchAudioList = async () => {
    try {
      console.log('Fetching audio list...');
      // 先尝试简化的API
      const response = await fetch('/api/admin/simple-audio', {
        credentials: 'include' // 包含认证cookie
      });
      
      console.log('Response status:', response.status);
      
      if (response.ok) {
        const result = await response.json();
        console.log('API response:', result);
        
        // 处理不同的响应格式
        let audioData = [];
        if (result.data && Array.isArray(result.data)) {
          audioData = result.data;
        } else if (Array.isArray(result)) {
          audioData = result;
        } else if (result.audioList && Array.isArray(result.audioList)) {
          audioData = result.audioList;
        }
        
        // 确保每个音频对象都有必要的字段
        const processedAudioData = audioData.map((audio: any) => ({
          ...audio,
          tags: typeof audio.tags === 'string' ? JSON.parse(audio.tags || '[]') : (audio.tags || []),
          uploadDate: audio.uploadDate || new Date().toISOString(),
          subject: audio.subject || '未分类',
          speaker: audio.speaker || '',
          duration: audio.duration || 0
        }));
        
        console.log('Processed audio data:', processedAudioData);
        setAudioList(processedAudioData);
        
        // 显示获取成功的消息（仅在开发环境）
        if (process.env.NODE_ENV === 'development') {
          console.log(`成功获取 ${processedAudioData.length} 条音频记录`);
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('API error:', errorData);
        message.error(errorData.error?.message || '获取音频列表失败');
      }
    } catch (error) {
      console.error('获取音频列表失败:', error);
      message.error('获取音频列表失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setLoading(false);
    }
  };

  const filterAudioList = () => {
    let filtered = audioList;

    if (searchText) {
      filtered = filtered.filter(audio =>
        audio.title.toLowerCase().includes(searchText.toLowerCase()) ||
        audio.description.toLowerCase().includes(searchText.toLowerCase()) ||
        audio.speaker?.toLowerCase().includes(searchText.toLowerCase())
      );
    }

    if (selectedSubject) {
      filtered = filtered.filter(audio => audio.subject === selectedSubject);
    }

    setFilteredList(filtered);
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/admin/simple-audio/${id}`, {
        method: 'DELETE',
        credentials: 'include' // 包含认证cookie
      });

      if (response.ok) {
        message.success('删除成功');
        fetchAudioList();
      } else {
        const data = await response.json();
        message.error(data.error || '删除失败');
      }
    } catch (error) {
      console.error('删除失败:', error);
      message.error('删除失败');
    }
  };

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的音频');
      return;
    }

    Modal.confirm({
      title: '确认批量删除',
      content: `确定要删除选中的 ${selectedRowKeys.length} 个音频吗？此操作不可恢复。`,
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: async () => {
        try {
          let successCount = 0;
          for (const id of selectedRowKeys) {
            const response = await fetch(`/api/admin/simple-audio/${id}`, {
              method: 'DELETE',
              credentials: 'include' // 包含认证cookie
            });
            if (response.ok) {
              successCount++;
            }
          }
          
          message.success(`成功删除 ${successCount} 个音频`);
          setSelectedRowKeys([]);
          fetchAudioList();
        } catch (error) {
          console.error('批量删除失败:', error);
          message.error('批量删除失败');
        }
      }
    });
  };

  const handleExport = () => {
    const exportData = filteredList.map(audio => ({
      标题: audio.title,
      描述: audio.description,
      学科: audio.subject,
      演讲者: audio.speaker || '',
      上传时间: new Date(audio.uploadDate).toLocaleDateString('zh-CN'),
      时长: audio.duration ? `${Math.floor(audio.duration / 60)}:${(audio.duration % 60).toString().padStart(2, '0')}` : '',
      标签: audio.tags.join(', '),
      文件名: audio.filename
    }));

    const csvContent = [
      Object.keys(exportData[0] || {}).join(','),
      ...exportData.map(row => Object.values(row).map(v => `"${v}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `音频列表_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleUpload = async (values: any) => {
    setUploading(true);
    setUploadProgress(0);

    try {
      console.log('开始上传音频，表单数据:', values);
      
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('description', values.description || '');
      formData.append('subject', values.subject);
      formData.append('tags', JSON.stringify(values.tags || []));
      formData.append('speaker', values.speaker || '');
      
      if (values.audio && values.audio[0]) {
        const audioFile = values.audio[0].originFileObj;
        console.log('音频文件信息:', {
          name: audioFile.name,
          type: audioFile.type,
          size: audioFile.size
        });
        formData.append('audio', audioFile);
      } else {
        console.error('没有找到音频文件');
        message.error('请选择音频文件');
        return;
      }

      console.log('发送上传请求到 /api/admin/simple-upload');
      const response = await fetch('/api/admin/simple-upload', {
        method: 'POST',
        body: formData,
        credentials: 'include' // 包含认证cookie
      });

      console.log('上传响应状态:', response.status);
      console.log('响应头:', Object.fromEntries(response.headers.entries()));
      
      let data;
      try {
        const responseText = await response.text();
        console.log('原始响应文本:', responseText);
        data = responseText ? JSON.parse(responseText) : {};
      } catch (parseError) {
        console.error('JSON解析错误:', parseError);
        data = { error: '响应格式错误' };
      }
      
      console.log('解析后的响应数据:', data);

      if (response.ok && data.success) {
        message.success('上传成功！');
        setUploadModalVisible(false);
        form.resetFields();
        // 延迟刷新列表，确保数据已经保存
        setTimeout(() => {
          fetchAudioList();
        }, 1000);
      } else {
        console.error('上传失败:', data);
        console.error('响应状态:', response.status);
        console.error('响应状态文本:', response.statusText);
        
        let errorMessage = '上传失败';
        if (data?.error) {
          errorMessage = typeof data.error === 'string' ? data.error : data.error.message || '未知错误';
        } else if (data?.message) {
          errorMessage = data.message;
        } else if (response.status === 401) {
          errorMessage = '认证失败，请重新登录';
        } else if (response.status === 403) {
          errorMessage = '权限不足，需要管理员权限';
        } else if (response.status === 413) {
          errorMessage = '文件太大，请选择较小的文件';
        } else {
          errorMessage = `HTTP ${response.status} 错误: ${response.statusText}`;
        }
        
        message.error(`上传失败: ${errorMessage}`);
      }
    } catch (error) {
      console.error('上传异常:', error);
      message.error('上传失败: ' + (error instanceof Error ? error.message : '未知错误'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const getSubjects = () => {
    const subjects = Array.from(new Set(audioList.map(audio => audio.subject)));
    return subjects.filter(subject => subject);
  };

  const columns: ColumnsType<AudioFile> = [
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      width: 200,
      ellipsis: true,
      render: (text: string, record: AudioFile) => (
        <div>
          <div className="font-medium">{text}</div>
          <div className="text-xs text-gray-500">{record.filename}</div>
          {record.speaker && (
            <div className="text-xs text-gray-500">演讲者: {record.speaker}</div>
          )}
        </div>
      )
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      width: 250,
      ellipsis: true
    },
    {
      title: '分类',
      dataIndex: 'subject',
      key: 'subject',
      width: 100,
      render: (subject: string) => (
        <Tag color="blue">{subject}</Tag>
      )
    },
    {
      title: '标签',
      dataIndex: 'tags',
      key: 'tags',
      width: 150,
      render: (tags: string[]) => (
        <Space size="small">
          {tags?.slice(0, 3).map(tag => (
            <Tag key={tag}>{tag}</Tag>
          ))}
          {tags?.length > 3 && <span>...</span>}
        </Space>
      )
    },
    {
      title: '时长',
      dataIndex: 'duration',
      key: 'duration',
      width: 80,
      render: (duration: number) => duration ? 
        `${Math.floor(duration / 60)}:${(duration % 60).toString().padStart(2, '0')}` : 
        '-',
      sorter: (a: AudioFile, b: AudioFile) => (a.duration || 0) - (b.duration || 0)
    },
    {
      title: '上传时间',
      dataIndex: 'uploadDate',
      key: 'uploadDate',
      width: 120,
      render: (date: string) => new Date(date).toLocaleDateString('zh-CN'),
      sorter: (a: AudioFile, b: AudioFile) => 
        new Date(a.uploadDate).getTime() - new Date(b.uploadDate).getTime()
    },
    {
      title: '操作',
      key: 'actions',
      fixed: 'right',
      width: 120,
      render: (_, record: AudioFile) => (
        <Space>
          <Button
            type="primary"
            size="small"
            icon={<EditOutlined />}
            href={`/admin/audio/edit/${record.id}`}
            title="编辑"
          />
          <Popconfirm
            title="确认删除"
            description={`确定要删除音频 "${record.title}" 吗？`}
            onConfirm={() => handleDelete(record.id)}
            okText="确认"
            cancelText="取消"
          >
            <Button
              danger
              size="small"
              icon={<DeleteOutlined />}
              title="删除"
            />
          </Popconfirm>
        </Space>
      )
    }
  ];

  return (
    <AntdAdminLayout>
      <div className="space-y-6">
        {/* 统计卡片 */}
        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="音频总数"
                value={audioList.length}
                prefix={<SoundOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="分类数量"
                value={getSubjects().length}
                prefix={<PlayCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={8}>
            <Card>
              <Statistic
                title="本月新增"
                value={audioList.filter(audio => {
                  const uploadDate = new Date(audio.uploadDate);
                  const now = new Date();
                  return uploadDate.getMonth() === now.getMonth() && 
                         uploadDate.getFullYear() === now.getFullYear();
                }).length}
                prefix={<PlusOutlined />}
              />
            </Card>
          </Col>
        </Row>

        {/* 主要内容 */}
        <Card>
          <div className="mb-4 flex justify-between items-center">
            <Title level={4} style={{ margin: 0 }}>音频管理</Title>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setUploadModalVisible(true)}
            >
              上传音频
            </Button>
          </div>

          {/* 搜索和筛选 */}
          <div className="mb-4 flex flex-col sm:flex-row gap-4">
            <Search
              placeholder="搜索音频标题、描述或演讲者"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ flex: 1 }}
              allowClear
            />
            <Select
              placeholder="选择分类"
              value={selectedSubject}
              onChange={setSelectedSubject}
              style={{ width: 200 }}
              allowClear
            >
              {getSubjects().map(subject => (
                <Option key={subject} value={subject}>{subject}</Option>
              ))}
            </Select>
          </div>

          {/* 音频列表表格 */}
          <div className="mb-4">
            <Space>
              <Button
                type="primary"
                danger
                icon={<DeleteOutlined />}
                disabled={selectedRowKeys.length === 0}
                onClick={handleBatchDelete}
              >
                批量删除 ({selectedRowKeys.length})
              </Button>
              <Button
                icon={<ExportOutlined />}
                onClick={handleExport}
              >
                导出数据
              </Button>
            </Space>
          </div>
          <Table
            columns={columns}
            dataSource={filteredList}
            rowKey="id"
            loading={loading}
            rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
            pagination={{
              total: filteredList.length,
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
            }}
            scroll={{ x: 1000 }}
          />
        </Card>

        {/* 上传音频模态框 */}
        <Modal
          title="上传音频"
          open={uploadModalVisible}
          onCancel={() => {
            setUploadModalVisible(false);
            form.resetFields();
          }}
          footer={null}
          width={600}
        >
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

            <Row gutter={16}>
              <Col xs={24} sm={12}>
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
              </Col>
              <Col xs={24} sm={12}>
                <Form.Item
                  name="speaker"
                  label="演讲者"
                >
                  <Input placeholder="请输入演讲者姓名" />
                </Form.Item>
              </Col>
            </Row>

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

            {uploading && (
              <Progress percent={uploadProgress} />
            )}

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={uploading}
                >
                  上传
                </Button>
                <Button
                  onClick={() => {
                    setUploadModalVisible(false);
                    form.resetFields();
                  }}
                >
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>
      </div>
    </AntdAdminLayout>
  );
}

export default function AudioManagementPage() {
  return (
    <AntdAdminGuard>
      <AudioManagement />
    </AntdAdminGuard>
  );
}