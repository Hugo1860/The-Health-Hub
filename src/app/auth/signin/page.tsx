'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Form, 
  Input, 
  Button, 
  Typography, 
  Alert, 
  Space
} from 'antd'
import { 
  LoginOutlined,
  HomeOutlined,
  UserAddOutlined,
  HeartOutlined,
  SafetyOutlined,
  TeamOutlined
} from '@ant-design/icons'
import { useAuth } from '../../../contexts/AuthContext'

const { Title, Text } = Typography;

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
      display: 'flex',
      background: 'radial-gradient(1200px 800px at 10% 10%, rgba(255,255,255,0.65) 0%, rgba(255,255,255,0.35) 25%, rgba(240,248,255,0.35) 45%, rgba(213,232,255,0.35) 60%, rgba(200,220,255,0.3) 100%), linear-gradient(135deg, #e0f7ff 0%, #f5f3ff 100%)'
    }}>
      {/* 左侧宣传区域 - 占据2/3宽度 */}
      <div style={{
        flex: '2',
        background: 'linear-gradient(135deg, #34c9ff 0%, #6366f1 100%)',
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
            🏥
          </div>
          
          <Title level={1} style={{ 
            color: 'white', 
            fontSize: '48px',
            fontWeight: '700',
            marginBottom: '16px',
            textShadow: '0 2px 4px rgba(0,0,0,0.1)'
          }}>
            健闻局
          </Title>
          
          <Title level={2} style={{ 
            color: 'rgba(255,255,255,0.9)', 
            fontSize: '24px',
            fontWeight: '300',
            marginBottom: '32px'
          }}>
            The Health Hub
          </Title>
          
          <Text style={{ 
            fontSize: '18px', 
            color: 'rgba(255,255,255,0.8)',
            lineHeight: '1.6',
            display: 'block',
            marginBottom: '48px'
          }}>
            专业的医学知识分享平台，汇聚全球医学专家智慧，
            为医学工作者提供最前沿的学术资源和交流空间
          </Text>
          
          {/* 特色功能展示 */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-around',
            marginTop: '48px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <HeartOutlined style={{ fontSize: '32px', color: '#ff6b6b', marginBottom: '12px' }} />
              <Text style={{ color: 'white', display: 'block', fontSize: '14px' }}>专业内容</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <SafetyOutlined style={{ fontSize: '32px', color: '#4ecdc4', marginBottom: '12px' }} />
              <Text style={{ color: 'white', display: 'block', fontSize: '14px' }}>安全可靠</Text>
            </div>
            <div style={{ textAlign: 'center' }}>
              <TeamOutlined style={{ fontSize: '32px', color: '#45b7d1', marginBottom: '12px' }} />
              <Text style={{ color: 'white', display: 'block', fontSize: '14px' }}>专家社区</Text>
            </div>
          </div>
        </div>
      </div>

      {/* 右侧登录区域 - 占据1/3宽度 */}
      <div style={{
        flex: '1',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '60px 40px',
        background: 'transparent',
        minWidth: '400px'
      }}>
        <div style={{ 
          width: '100%', 
          maxWidth: '360px',
          background: 'rgba(255,255,255,0.35)',
          border: '1px solid transparent',
          borderRadius: '24px',
          padding: '28px',
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.35)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.35), rgba(255,255,255,0.35)) , linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.25))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box'
        }}>
          {/* 登录标题 */}
          <div style={{ textAlign: 'center', marginBottom: '48px' }}>
            <LoginOutlined style={{ 
              fontSize: '48px', 
              color: '#667eea',
              marginBottom: '16px'
            }} />
            <Title level={2} style={{ 
              margin: 0, 
              color: '#2d3748',
              fontSize: '28px',
              fontWeight: '600'
            }}>
              欢迎回来
            </Title>
            <Text style={{ 
              fontSize: '16px', 
              color: '#718096',
              marginTop: '8px',
              display: 'block'
            }}>
              请登录您的账户
            </Text>
          </div>

          {/* 错误提示 */}
          {error && (
            <Alert
              message={error}
              type="error"
              showIcon
              style={{ 
                marginBottom: '16px',
                borderRadius: '16px',
                border: '1px solid rgba(255,0,0,0.15)',
                background: 'rgba(255,0,0,0.06)',
                backdropFilter: 'blur(6px)'
              }}
            />
          )}

          {/* 登录表单 */}
          <Form
            form={form}
            name="signin"
            onFinish={handleSubmit}
            layout="vertical"
            size="large"
          >
            <Form.Item
              name="email"
              label={<Text style={{ color: '#4a5568', fontWeight: '500' }}>邮箱地址</Text>}
              rules={[
                { required: true, message: '请输入邮箱地址' },
                { type: 'email', message: '请输入有效的邮箱地址' }
              ]}
              style={{ marginBottom: '24px' }}
            >
              <Input
                placeholder="请输入邮箱地址"
                type="email"
                autoComplete="email"
                className="signin-email"
                style={{
                  height: '56px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.4)',
                  border: '1px solid #c7c7cc',
                  boxShadow: 'none',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
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
              style={{ marginBottom: '32px' }}
            >
              <Input.Password
                placeholder="请输入密码"
                visibilityToggle={false}
                variant="borderless"
                autoComplete="current-password"
                className="signin-password"
                style={{
                  height: '56px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.4)',
                  border: 'none',
                  boxShadow: 'none',
                  backdropFilter: 'blur(10px)',
                  WebkitBackdropFilter: 'blur(10px)',
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
                  height: '56px',
                  borderRadius: '20px',
                  background: 'linear-gradient(135deg, #34c9ff 0%, #6366f1 100%)',
                  border: 'none',
                  fontSize: '16px',
                  fontWeight: 600,
                  boxShadow: '0 10px 24px rgba(99,102,241,0.35), 0 4px 12px rgba(52,201,255,0.25)'
                }}
              >
                {isLoading ? '登录中...' : '登录'}
              </Button>
            </Form.Item>
          </Form>

          {/* 其他操作 */}
          <div style={{ textAlign: 'center' }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                type="link"
                icon={<UserAddOutlined />}
                href="/auth/signup"
                style={{
                  color: '#667eea',
                  fontSize: '14px',
                  padding: 0,
                  height: 'auto'
                }}
              >
                还没有账户？立即注册
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
        
        :global(*) { font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Arial, 'PingFang SC', 'Noto Sans SC', 'Segoe UI', Roboto, sans-serif; }

        /* 密码输入框：仅保留一层外边框（无内边框、无阴影） */
        :global(.signin-password.ant-input-affix-wrapper) {
          border: 1px solid #c7c7cc !important; /* 单一外边框 */
          box-shadow: none !important;
          outline: none !important;
          background: rgba(255,255,255,0.4) !important;
          border-radius: 18px !important;
        }
        :global(.signin-password.ant-input-affix-wrapper:hover),
        :global(.signin-password.ant-input-affix-wrapper-focused),
        :global(.signin-password:focus-within) {
          border-color: #a3a3a3 !important; /* 聚焦仅变色，不叠加阴影 */
          box-shadow: none !important;
          outline: none !important;
          background: rgba(255,255,255,0.45) !important;
        }
        :global(.signin-password input) {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }

        /* 账号输入框：与密码框统一，仅保留一层外边框 */
        :global(.signin-email) {
          border: 1px solid #c7c7cc !important;
          box-shadow: none !important;
          outline: none !important;
          background: rgba(255,255,255,0.4) !important;
          border-radius: 18px !important;
        }
        :global(.signin-email:hover),
        :global(.signin-email:focus),
        :global(.signin-email:focus-visible) {
          border-color: #a3a3a3 !important;
          box-shadow: none !important;
          outline: none !important;
          background: rgba(255,255,255,0.45) !important;
        }

        /* 响应式设计 */
        @media (max-width: 768px) {
          .signin-container {
            flex-direction: column;
          }
          .promo-section {
            flex: none;
            height: 40vh;
            padding: 40px 20px;
          }
          .login-section {
            flex: none;
            padding: 40px 20px;
            min-width: auto;
          }
        }
      `}</style>
    </div>
  )
}