"use client";

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { 
  Form, 
  Input, 
  Select, 
  Button, 
  Card, 
  message, 
  Space, 
  Row, 
  Col,
  Tag,
  Typography,
  Divider,
  DatePicker,
  Spin
} from 'antd';
import { 
  SaveOutlined, 
  ArrowLeftOutlined,
  SoundOutlined,
  CalendarOutlined,
  UserOutlined,
  BookOutlined,
  TagOutlined
} from '@ant-design/icons';
import dayjs from 'dayjs';
import AntdAdminLayout from '../../../../../components/AntdAdminLayout';
import { AntdAdminGuard } from '../../../../../components/AntdAdminGuard';

const { Title, Text } = Typography;
const { TextArea } = Input;
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
  transcription?: string;
}

function EditAudioForm() {
  const { id } = useParams();
  const router = useRouter();
  const [form] = Form.useForm();
  
  const [audio, setAudio] = useState<AudioFile | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tagInput, setTagInput] = useState('');

  useEffect(() => {
    fetchAudio();
  }, [id]);

  const fetchAudio = async () => {
    try {
      const response = await fetch(`/api/admin/simple-audio/${id}`, {
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('获取音频信息失败');
      }
      const data = await response.json();
      setAudio(data);
      
      // 设置表单初始值
      form.setFieldsValue({
        title: data.title,
        description: data.description,
        subject: data.subject,
        speaker: data.speaker || '',
        recordingDate: data.recordingDate ? dayjs(data.recordingDate) : null,
        tags: data.tags || [],
        transcription: data.transcription || ''
      });
    } catch (error) {
      console.error('获取音频信息失败:', error);
      message.error('获取音频信息失败');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (values: any) => {
    setSubmitting(true);
    try {
      const updateData = {
        ...values,
        recordingDate: values.recordingDate ? values.recordingDate.format('YYYY-MM-DD') : null
      };

      const response = await fetch(`/api/admin/simple-audio/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        message.success('音频信息更新成功');
        router.push('/admin/audio');
      } else {
        const data = await response.json();
        message.error(data.error || '更新失败');
      }
    } catch (error) {
      console.error('更新音频信息失败:', error);
      message.error('更新音频信息失败');
    } finally {
      setSubmitting(false);
    }
  };

  const handleBack = () => {
    router.push('/admin/audio');
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <Space>
          <Button 
            type="text" 
            icon={<ArrowLeftOutlined />} 
            onClick={handleBack}
            className="text-gray-600 hover:text-gray-800"
          >
            返回音频管理
          </Button>
          <Title level={3} style={{ margin: 0 }}>
            编辑音频信息
          </Title>
        </Space>
        <Text type="secondary">
          {audio?.filename}
        </Text>
      </div>

      <Row gutter={24}>
        <Col xs={24} lg={16}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            className="space-y-6"
          >
            {/* 基本信息 */}
            <Card title="基本信息" className="shadow-sm">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="title"
                    label="音频标题"
                    rules={[
                      { required: true, message: '请输入音频标题' },
                      { max: 200, message: '标题不能超过200个字符' }
                    ]}
                  >
                    <Input 
                      prefix={<SoundOutlined />} 
                      placeholder="请输入音频标题"
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="speaker"
                    label="演讲者"
                  >
                    <Input 
                      prefix={<UserOutlined />} 
                      placeholder="请输入演讲者姓名"
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item
                name="description"
                label="音频描述"
                rules={[
                  { max: 2000, message: '描述不能超过2000个字符' }
                ]}
              >
                <TextArea 
                  rows={4}
                  placeholder="请输入音频描述"
                  showCount
                  maxLength={2000}
                />
              </Form.Item>
            </Card>

            {/* 分类信息 */}
            <Card title="分类信息" className="shadow-sm">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="subject"
                    label="学科分类"
                    rules={[
                      { required: true, message: '请选择学科分类' }
                    ]}
                  >
                    <Select 
                      prefix={<BookOutlined />} 
                      placeholder="请选择学科分类"
                    >
                      <Option value="心血管">心血管</Option>
                      <Option value="神经科">神经科</Option>
                      <Option value="肿瘤科">肿瘤科</Option>
                      <Option value="外科">外科</Option>
                      <Option value="儿科">儿科</Option>
                      <Option value="妇产科">妇产科</Option>
                      <Option value="精神科">精神科</Option>
                      <Option value="影像科">影像科</Option>
                      <Option value="检验科">检验科</Option>
                      <Option value="其他">其他</Option>
                    </Select>
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    name="recordingDate"
                    label="录制日期"
                  >
                    <DatePicker 
                      style={{ width: '100%' }}
                      placeholder="选择录制日期"
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Card>

            {/* 标签 */}
            <Card title="标签" className="shadow-sm">
              <Form.Item name="tags">
                <Select
                  mode="tags"
                  placeholder="请输入标签，按回车添加"
                  style={{ width: '100%' }}
                  maxTagCount={10}
                  maxTagTextLength={20}
                />
              </Form.Item>
            </Card>

            {/* 转录文本 */}
            <Card title="转录文本" className="shadow-sm">
              <Form.Item name="transcription">
                <TextArea 
                  rows={6}
                  placeholder="请输入音频转录文本"
                  showCount
                  maxLength={50000}
                />
              </Form.Item>
            </Card>

            {/* 提交按钮 */}
            <Form.Item>
              <Space>
                <Button 
                  type="primary" 
                  htmlType="submit"
                  loading={submitting}
                  icon={<SaveOutlined />}
                >
                  保存修改
                </Button>
                <Button onClick={handleBack}>
                  取消
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Col>

        <Col xs={24} lg={8}>
          {/* 音频信息卡片 */}
          <Card title="音频信息" className="shadow-sm">
            <Space direction="vertical" className="w-full">
              <div>
                <Text strong>文件名：</Text>
                <Text>{audio?.filename}</Text>
              </div>
              <div>
                <Text strong>上传时间：</Text>
                <Text>{audio?.uploadDate ? new Date(audio.uploadDate).toLocaleDateString('zh-CN') : '-'}</Text>
              </div>
              <div>
                <Text strong>音频时长：</Text>
                <Text>
                  {audio?.duration ? 
                    `${Math.floor(audio.duration / 60)}:${(audio.duration % 60).toString().padStart(2, '0')}` : 
                    '未知'
                  }
                </Text>
              </div>
              <div>
                <Text strong>文件大小：</Text>
                <Text>-</Text>
              </div>
            </Space>
          </Card>

          {/* 标签预览 */}
          <Card title="当前标签" className="shadow-sm">
            <Form.Item noStyle shouldUpdate>
              {({ getFieldValue }) => {
                const tags = getFieldValue('tags') || [];
                return tags.length > 0 ? (
                  <Space wrap>
                    {tags.map((tag: string) => (
                      <Tag key={tag} color="blue">{tag}</Tag>
                    ))}
                  </Space>
                ) : (
                  <Text type="secondary">暂无标签</Text>
                );
              }}
            </Form.Item>
          </Card>
        </Col>
      </Row>
    </div>
  );
}

export default function EditAudioPage() {
  return (
    <AntdAdminGuard>
      <AntdAdminLayout>
        <EditAudioForm />
      </AntdAdminLayout>
    </AntdAdminGuard>
  );
}