'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '../../contexts/AuthContext'
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Form,
  Input,
  Select,
  Switch,
  Slider,
  Button,
  Space,
  Divider,
  message,
  Breadcrumb,
  Avatar,
  Upload,
  Tabs
} from 'antd'
import {
  UserOutlined,
  SettingOutlined,
  HomeOutlined,
  BellOutlined,
  SecurityScanOutlined,
  SoundOutlined,
  UploadOutlined,
  BgColorsOutlined
} from '@ant-design/icons'
import Link from 'next/link'
import AntdHomeLayout from '../../components/AntdHomeLayout'

const { Title, Text } = Typography
const { Content } = Layout
const { TabPane } = Tabs

export default function SettingsPage() {
  const { user, isLoading, updateProfile } = useAuth()
  const router = useRouter()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('profile')

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/auth/signin')
      return
    }

    if (user) {
      form.setFieldsValue({
        username: user.username,
        email: user.email,
        theme: user.preferences?.theme || 'light',
        autoplay: user.preferences?.autoplay || false,
        defaultPlaybackRate: user.preferences?.defaultPlaybackRate || 1,
        defaultVolume: user.preferences?.defaultVolume || 0.8
      })
    }
  }, [user, isLoading, router, form])

  const handleSubmit = async (values: any) => {
    setLoading(true)
    try {
      const result = await updateProfile({
        username: values.username,
        preferences: {
          theme: values.theme,
          autoplay: values.autoplay,
          defaultPlaybackRate: values.defaultPlaybackRate,
          defaultVolume: values.defaultVolume
        }
      })

      if (result.success) {
        message.success('设置保存成功！')
      } else {
        message.error(result.error || '保存失败')
      }
    } catch (error) {
      message.error('保存失败，请稍后重试')
    } finally {
      setLoading(false)
    }
  }

  if (isLoading) {
    return (
      <AntdHomeLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Text>加载中...</Text>
        </div>
      </AntdHomeLayout>
    )
  }

  if (!user) {
    return null
  }

  return (
    <AntdHomeLayout>
      <div style={{ padding: '24px' }}>
        {/* 面包屑导航 */}
        <Breadcrumb style={{ marginBottom: 24 }}>
          <Breadcrumb.Item>
            <Link href="/">
              <HomeOutlined /> 首页
            </Link>
          </Breadcrumb.Item>
          <Breadcrumb.Item>
            <SettingOutlined /> 设置
          </Breadcrumb.Item>
        </Breadcrumb>

        <Row gutter={[24, 24]}>
          <Col xs={24} lg={6}>
            {/* 用户信息卡片 */}
            <Card>
              <div style={{ textAlign: 'center' }}>
                <Avatar
                  size={80}
                  style={{ backgroundColor: '#13C2C2', marginBottom: 16 }}
                  icon={<UserOutlined />}
                >
                  {user.username?.charAt(0) || user.email?.charAt(0)}
                </Avatar>
                <Title level={4} style={{ margin: 0 }}>
                  {user.username || user.email}
                </Title>
                <Text type="secondary">
                  {user.role === 'admin' ? '管理员' : '用户'}
                </Text>
              </div>
            </Card>
          </Col>

          <Col xs={24} lg={18}>
            <Card>
              <Tabs 
                activeKey={activeTab} 
                onChange={setActiveTab}
                items={[
                  {
                    key: 'profile',
                    label: (
                      <span>
                        <UserOutlined />
                        个人资料
                      </span>
                    ),
                    children: (
                      <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        style={{ maxWidth: 600 }}
                      >
                        <Form.Item
                          label="用户名"
                          name="username"
                          rules={[{ required: true, message: '请输入用户名' }]}
                        >
                          <Input size="large" />
                        </Form.Item>

                        <Form.Item
                          label="邮箱"
                          name="email"
                        >
                          <Input size="large" disabled />
                        </Form.Item>

                        <Form.Item>
                          <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading}
                            size="large"
                          >
                            保存个人资料
                          </Button>
                        </Form.Item>
                      </Form>
                    )
                  },
                  {
                    key: 'appearance',
                    label: (
                      <span>
                        <BgColorsOutlined />
                        外观设置
                      </span>
                    ),
                    children: (
                      <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        style={{ maxWidth: 600 }}
                      >
                        <Form.Item
                          label="主题模式"
                          name="theme"
                        >
                          <Select size="large">
                            <Select.Option value="light">浅色模式</Select.Option>
                            <Select.Option value="dark">深色模式</Select.Option>
                            <Select.Option value="system">跟随系统</Select.Option>
                          </Select>
                        </Form.Item>

                        <Form.Item>
                          <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading}
                            size="large"
                          >
                            保存外观设置
                          </Button>
                        </Form.Item>
                      </Form>
                    )
                  },
                  {
                    key: 'audio',
                    label: (
                      <span>
                        <SoundOutlined />
                        音频设置
                      </span>
                    ),
                    children: (
                      <Form
                        form={form}
                        layout="vertical"
                        onFinish={handleSubmit}
                        style={{ maxWidth: 600 }}
                      >
                        <Form.Item
                          label="自动播放"
                          name="autoplay"
                          valuePropName="checked"
                        >
                          <Switch />
                        </Form.Item>

                        <Form.Item
                          label="默认播放速度"
                          name="defaultPlaybackRate"
                        >
                          <Slider
                            min={0.5}
                            max={2}
                            step={0.25}
                            marks={{
                              0.5: '0.5x',
                              1: '1x',
                              1.5: '1.5x',
                              2: '2x'
                            }}
                          />
                        </Form.Item>

                        <Form.Item
                          label="默认音量"
                          name="defaultVolume"
                        >
                          <Slider
                            min={0}
                            max={1}
                            step={0.1}
                            marks={{
                              0: '0%',
                              0.5: '50%',
                              1: '100%'
                            }}
                          />
                        </Form.Item>

                        <Form.Item>
                          <Button 
                            type="primary" 
                            htmlType="submit" 
                            loading={loading}
                            size="large"
                          >
                            保存音频设置
                          </Button>
                        </Form.Item>
                      </Form>
                    )
                  },
                  {
                    key: 'notifications',
                    label: (
                      <span>
                        <BellOutlined />
                        通知设置
                      </span>
                    ),
                    children: (
                      <div style={{ maxWidth: 600 }}>
                        <Space direction="vertical" size="large" style={{ width: '100%' }}>
                          <div>
                            <Title level={5}>推送通知</Title>
                            <Space direction="vertical">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text>新音频通知</Text>
                                <Switch defaultChecked />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text>评论回复通知</Text>
                                <Switch defaultChecked />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text>系统消息通知</Text>
                                <Switch defaultChecked />
                              </div>
                            </Space>
                          </div>

                          <Divider />

                          <div>
                            <Title level={5}>邮件通知</Title>
                            <Space direction="vertical">
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text>每周摘要</Text>
                                <Switch />
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Text>重要更新</Text>
                                <Switch defaultChecked />
                              </div>
                            </Space>
                          </div>

                          <Button type="primary" size="large">
                            保存通知设置
                          </Button>
                        </Space>
                      </div>
                    )
                  }
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    </AntdHomeLayout>
  )
}