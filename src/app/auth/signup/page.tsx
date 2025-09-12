'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Form, 
  Input, 
  Button, 
  Typography, 
  Alert, 
  Space,
  Result
} from 'antd'
import { 
  UserOutlined, 
  LockOutlined, 
  MailOutlined,
  UserAddOutlined,
  HomeOutlined,
  LoginOutlined,
  CheckCircleOutlined,
  BookOutlined,
  GlobalOutlined,
  StarOutlined
} from '@ant-design/icons'
import { useAuth } from '../../../contexts/AuthContext'

const { Title, Text } = Typography;

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '16px',
          padding: '60px',
          maxWidth: '500px',
          width: '100%',
          textAlign: 'center',
          boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
        }}>
          <Result
            icon={<CheckCircleOutlined style={{ color: '#667eea', fontSize: '72px' }} />}
            title={<Title level={2} style={{ color: '#2d3748' }}>注册成功！</Title>}
            subTitle={<Text style={{ color: '#718096', fontSize: '16px' }}>您的账户已创建成功，正在跳转到登录页面...</Text>}
            extra={[
              <Button 
                type="primary" 
                key="signin"
                icon={<LoginOutlined />}
                href="/auth/signin"
                size="large"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  marginRight: '12px'
                }}
              >
                立即登录
              </Button>,
              <Button 
                key="home" 
                icon={<HomeOutlined />} 
                href="/"
                size="large"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  fontSize: '16px'
                }}
              >
                返回首页
              </Button>
            ]}
          />
        </div>
      </div>
    )
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex',
      background: '#ffffff'
    }}>
      {/* 左侧宣传区域 - 占据2/3宽度 */}
      <div style={{
        flex: '2',
        background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* 背景装饰 */}
        <div style={{
          position: 'absolute',
          top: '-50%',
          left: '-50%',
          width: '200%',
          height: '200%',
          background: 'radial-gradient(circle, rgba(255,255,255,0.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px',
          animation: 'float 20s ease-in-out infinite'
        }} />
        
        {/* 主要内容 */}
        <div style={{ 
          textAlign: 'center', 
          color: 'white',
          zIndex: 1,
          maxWidth: '500px'
        }}>
          <div style={{
            fontSize: '72px',
            marginBottom: '24px',
            background: 'linear-gradient(45deg, #fff, #e0e7ff)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 'bold'
          }}>
            🚀
          </div>
          
          <Title level={1} style={{ 
            color: 'white', 
            fontSize: '48px',
            fontWeight: '700',
            marginBottom: '16px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            加入我们
          </Title>
          
          <Title level={2} style={{ 
            color: 'rgba(255,255,255,0.9)', 
            fontSize: '24px',
            fontWeight: '300',
            marginBottom: '32px'
          }}>
            开启医学学习之旅
          </Title>
          
          <Text style={{ 
            fontSize: '18px', 
            color: 'rgba(255,255,255,0.8)',
            lineHeight: '1.6',
            display: 'block',
            marginBottom: '48px'
          }}>
            成为健闻局的一员，与全球医学专家一起学习交流，
            获取最新的医学资讯和专业知识，提升您的医学素养
          </Text>
          
          {/* 特色功能展示 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: '48px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <BookOutlined style={{ fontSize: '32px', color: '#ffd93d', marginBottom: '12px' }} />
              <Text style={{ color: 'white', display: 'block', fontSize: '14px' }}>丰富资源</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <GlobalOutlined style={{ fontSize: '32px', color: '#6bcf7f', marginBottom: '12px' }} />
              <Text style={{ color: 'white', display: 'block', fontSize: '14px' }}>全球视野</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <StarOutlined style={{ fontSize: '32px', color: '#4d9de0', marginBottom: '12px' }} />
              <Text style={{ color: 'white', display: 'block', fontSize: '14px' }}>专业认证</Text>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧注册区域 - 占据1/3宽度 */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 40px',
        background: '#ffffff',
        minWidth: '400px'
      }}>
        <div style={{ width: '100%', maxWidth: '360px' }}>
          {/* 注册标题 */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <UserAddOutlined style={{ 
              fontSize: '48px', 
              color: '#764ba2',
              marginBottom: '16px'
            }} />
            <Title level={2} style={{ 
              margin: 0, 
              color: '#2d3748',
              fontSize: '28px',
              fontWeight: '600'
            }}>
              创建账户
            </Title>
            <Text style={{ 
              fontSize: '16px', 
              color: '#718096',
              marginTop: '8px',
              display: 'block'
            }}>
              加入健闻局专业社区
            </Text>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ 
                marginBottom: '24px',
                borderRadius: '8px',
                border: '1px solid #fed7d7'
              }}
            />
          )}

          {/* 注册表单 */}
          <Form
            form={form}
            name="signup"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="username"
              label={<Text style={{ color: '#4a5568', fontWeight: '500' }}>用户名</Text>}
              rules={[
                { required: true, message: '请输入用户名' },
                { min: 2, message: '用户名至少2位' },
                { max: 20, message: '用户名最多20位' }
              ]}
              style={{ marginBottom: '20px' }}
            >
              <Input
                prefix={<UserOutlined style={{ color: '#a0aec0' }} />}
                placeholder="请输入用户名"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  fontSize: '16px'
                }}
              />
            </Form.Item>

            <Form.Item
              name="email"
              label={<Text style={{ color: '#4a5568', fontWeight: '500' }}>邮箱地址</Text>}
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
              style={{ marginBottom: '20px' }}
            >
              <Input
                prefix={<MailOutlined style={{ color: '#a0aec0' }} />}
                placeholder="请输入邮箱地址"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  fontSize: '16px'
                }}
              />
            </Form.Item>

            <Form.Item
              name="password"
              label={<Text style={{ color: '#4a5568', fontWeight: '500' }}>密码</Text>}
              rules={[
                { required: true, message: '请输入密码' },
                { min: 6, message: '密码至少6位' }
              ]}
              style={{ marginBottom: '20px' }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#a0aec0' }} />}
                placeholder="请输入密码（至少6位）"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  fontSize: '16px'
                }}
              />
            </Form.Item>

            <Form.Item
              name="confirmPassword"
              label={<Text style={{ color: '#4a5568', fontWeight: '500' }}>确认密码</Text>}
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
              style={{ marginBottom: '32px' }}
            >
              <Input.Password
                prefix={<LockOutlined style={{ color: '#a0aec0' }} />}
                placeholder="请再次输入密码"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  backgroundColor: 'transparent',
                  fontSize: '16px'
                }}
              />
            </Form.Item>

            <Form.Item style={{ marginBottom: '24px' }}>
              <Button
                type="primary"
                htmlType="submit"
                loading={isLoading}
                block
                size="large"
                style={{
                  height: '48px',
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, #764ba2 0%, #667eea 100%)',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: '500',
                  boxShadow: '0 4px 12px rgba(118, 75, 162, 0.4)'
                }}
              >
                {isLoading ? '注册中...' : '创建账户'}
              </Button>
            </Form.Item>
          </Form>

          {/* 其他操作 */}
          <div style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                type="link"
                icon={<LoginOutlined />}
                href="/auth/signin"
                style={{
                  color: '#764ba2',
                  fontSize: '14px',
                  padding: 0,
                  height: 'auto'
                }}
              >
                已有账户？立即登录
              </Button>
              
              <Button
                type="link"
                icon={<HomeOutlined />}
                href="/"
                style={{
                  color: '#718096',
                  fontSize: '14px',
                  padding: 0,
                  height: 'auto'
                }}
              >
                返回首页
              </Button>
            </Space>
          </div>
        </div>
      </div>

      {/* CSS动画 */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0px) rotate(0deg); }
          50% { transform: translateY(-20px) rotate(180deg); }
        }
        
        /* 响应式设计 */
        @media (max-width: 768px) {
          .signup-container {
            flex-direction: column;
          }
          .promo-section {
            flex: none;
            height: 40vh;
            padding: 40px 20px;
          }
          .signup-section {
            flex: none;
            padding: 40px 20px;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  )
}