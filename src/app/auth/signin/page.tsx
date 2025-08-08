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
  Col
} from 'antd'
import { 
  UserOutlined, 
  LockOutlined, 
  LoginOutlined,
  HomeOutlined,
  UserAddOutlined
} from '@ant-design/icons'
import { useAuth } from '../../../contexts/AuthContext'

const { Title, Text, Paragraph } = Typography;

export default function SignInPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [form] = Form.useForm()
  
  const { login } = useAuth()
  const router = useRouter()

  const handleSubmit = async (values: { email: string; password: string }) => {
    setIsLoading(true)
    setError('')

    try {
      const success = await login(values.email, values.password)
      
      if (success) {
        router.push('/')
      } else {
        setError('邮箱或密码错误')
      }
    } catch (error) {
      setError('登录失败，请稍后重试')
    } finally {
      setIsLoading(false)
    }
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
                <LoginOutlined style={{ fontSize: 32, color: 'white' }} />
              </div>
              <Title level={2} style={{ margin: 0, color: '#333333' }}>
                用户登录
              </Title>
              <Text style={{ fontSize: 16, color: '#999999' }}>
                登录到健闻局 The Health Hub
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
              name="signin"
              onFinish={handleSubmit}
              layout="vertical"
              size="large"
            >
              <Form.Item
                name="email"
                label="邮箱地址"
                rules={[
                  { required: true, message: '请输入邮箱地址' },
                  { type: 'email', message: '请输入有效的邮箱地址' }
                ]}
              >
                <Input
                  prefix={<UserOutlined />}
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
                  placeholder="请输入密码"
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
                  {isLoading ? '登录中...' : '登录'}
                </Button>
              </Form.Item>
            </Form>

            <Divider>其他操作</Divider>

            <Space direction="vertical" style={{ width: '100%' }}>
              <Button
                type="link"
                icon={<UserAddOutlined />}
                block
                href="/auth/signup"
              >
                还没有账户？立即注册
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