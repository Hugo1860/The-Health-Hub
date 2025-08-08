'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Form, 
  Input, 
  Button, 
  Card, 
  Typography, 
  Alert, 
  Space,
  Divider,
  Row,
  Col,
  Result
} from 'antd'
import { 
  UserOutlined, 
  LockOutlined, 
  MailOutlined,
  UserAddOutlined,
  HomeOutlined,
  LoginOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useAuth } from '../../../contexts/AuthContext'

const { Title, Text, Paragraph } = Typography;

export default function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [form] = Form.useForm()
  
  const { register } = useAuth()
  const router = useRouter()

  const handleSubmit = async (values: { 
    username: string; 
    email: string; 
    password: string; 
    confirmPassword: string 
  }) => {
    setIsLoading(true)
    setError('')
    setSuccess(false)

    try {
      const result = await register(values.username, values.email, values.password)
      
      if (result.success) {
        setSuccess(true)
        setTimeout(() => {
          router.push('/auth/signin')
        }, 2000)
      } else {
        setError(result.error || '注册失败')
      }
    } catch (error) {
      setError('注册失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
  }

  if (success) {
    return (
      <div style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(135deg, #F7F8FA 0%, #E8F4F8 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <Row justify="center" style={{ width: '100%', maxWidth: 1200 }}>
          <Col xs={24} sm={20} md={16} lg={12} xl={8}>
            <Card
              style={{
                borderRadius: 16,
                boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
                border: 'none'
              }}
            >
              <Result
                icon={<CheckCircleOutlined style={{ color: '#13C2C2' }} />}
                title="注册成功！"
                subTitle="您的账户已创建成功，正在跳转到登录页面..."
                extra={[
                  <Button 
                    type="primary" 
                    key="signin"
                    icon={<LoginOutlined />}
                    href="/auth/signin"
                    style={{
                      background: 'linear-gradient(135deg, #13C2C2, #36CFC9)',
                      border: 'none'
                    }}
                  >
                    立即登录
                  </Button>,
                  <Button key="home" icon={<HomeOutlined />} href="/">
                    返回首页
                  </Button>
                ]}
              />
            </Card>
          </Col>
        </Row>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #F7F8FA 0%, #E8F4F8 100%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    }}>
      <Row justify="center" style={{ width: '100%', maxWidth: 1200 }}>
        <Col xs={24} sm={20} md={16} lg={12} xl={8}>
          <Card
            style={{
              borderRadius: 16,
              boxShadow: '0 20px 40px rgba(0,0,0,0.1)',
              border: 'none'
            }}
          >
            <div style={{ textAlign: 'center', marginBottom: 32 }}>
              <div style={{
                width: 80,
                height: 80,
                background: 'linear-gradient(135deg, #13C2C2, #36CFC9)',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                <UserAddOutlined style={{ fontSize: 32, color: 'white' }} />
              </div>
              <Title level={2} style={{ margin: 0, color: '#333333' }}>
                用户注册
              </Title>
              <Text style={{ fontSize: 16, color: '#999999' }}>
                创建您的健闻局账户
              </Text>
            </div>

            {error && (
              <Alert
                message={error}
                type="error"
                showIcon
                style={{ marginBottom: 24 }}
              />
            )}

            <Form
              form={form}
              name="signup"
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="username"
                label="用户名"
                rules={[
                  { required: true, message: '请输入用户名' },
                  { min: 2, message: '用户名至少2位' },
                  { max: 20, message: '用户名最多20位' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
                  placeholder="请输入用户名"
                />
              </Form.Item>

              <Form.Item
                name="email"
                label="邮箱地址"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input
                  prefix={<MailOutlined />}
                  placeholder="请输入邮箱地址"
                />
              </Form.Item>

              <Form.Item
                name="password"
                label="密码"
                rules={[
                  { required: true, message: '请输入密码' },
                  { min: 6, message: '密码至少6位' }
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请输入密码（至少6位）"
                />
              </Form.Item>

              <Form.Item
                name="confirmPassword"
                label="确认密码"
                dependencies={['password']}
                rules={[
                  { required: true, message: '请确认密码' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      if (!value || getFieldValue('password') === value) {
                        return Promise.resolve();
                      }
                      return Promise.reject(new Error('两次输入的密码不一致'));
                    },
                  }),
                ]}
              >
                <Input.Password
                  prefix={<LockOutlined />}
                  placeholder="请再次输入密码"
                />
              </Form.Item>

              <Form.Item style={{ marginBottom: 16 }}>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={isLoading}
                  block
                  size="large"
                  style={{
                    height: 48,
                    borderRadius: 8,
                    background: 'linear-gradient(135deg, #13C2C2, #36CFC9)',
                    border: 'none'
                  }}
                >
                  {isLoading ? '注册中...' : '注册'}
                </Button>
              </Form.Item>
            </Form>

            <Divider>其他操作</Divider>

            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="link"
                icon={<LoginOutlined />}
                block
                href="/auth/signin"
              >
                已有账户？立即登录
              </Button>
              
              <Button
                type="link"
                icon={<HomeOutlined />}
                block
                href="/"
              >
                返回首页
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}