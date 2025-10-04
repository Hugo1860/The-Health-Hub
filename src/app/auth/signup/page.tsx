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
          boxShadow: '0 12px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          backdropFilter: 'blur(18px)',
          WebkitBackdropFilter: 'blur(18px)',
          backgroundImage: 'linear-gradient(rgba(255,255,255,0.35), rgba(255,255,255,0.35)) , linear-gradient(135deg, rgba(255,255,255,0.9), rgba(255,255,255,0.25))',
          backgroundOrigin: 'border-box',
          backgroundClip: 'padding-box, border-box'
        }}>
          {/* 注册标题 */}
          <div style={{ textAlign: 'center', marginBottom: '32px' }}>
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
              color: 'rgba(0,0,0,0.45)',
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
                marginBottom: '16px',
                borderRadius: '16px',
                border: '1px solid rgba(255,0,0,0.15)',
                background: 'rgba(255,0,0,0.06)',
                backdropFilter: 'blur(6px)'
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
                className="signup-input"
                placeholder="请输入用户名"
                autoComplete="username"
                style={{
                  height: '56px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.4)',
                  border: '1px solid #c7c7cc',
                  boxShadow: 'none',
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
                className="signup-input"
                placeholder="请输入邮箱地址"
                type="email"
                autoComplete="email"
                style={{
                  height: '56px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.4)',
                  border: '1px solid #c7c7cc',
                  boxShadow: 'none',
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
                variant="borderless"
                className="signup-password"
                visibilityToggle={false}
                placeholder="请输入密码（至少6位）"
                autoComplete="new-password"
                style={{
                  height: '56px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.4)',
                  border: '1px solid #c7c7cc',
                  boxShadow: 'none',
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
                variant="borderless"
                className="signup-confirm"
                visibilityToggle={false}
                placeholder="请再次输入密码"
                autoComplete="new-password"
                style={{
                  height: '56px',
                  borderRadius: '18px',
                  background: 'rgba(255,255,255,0.4)',
                  border: '1px solid #c7c7cc',
                  boxShadow: 'none',
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
                  fontWeight: '600',
                  boxShadow: '0 10px 24px rgba(99,102,241,0.35), 0 4px 12px rgba(52,201,255,0.25)'
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
                  color: '#667eea',
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
        /* 用户名/邮箱：单外边框 + 圆角，去除阴影 */
        :global(.signup-input) {
          border: 1px solid #c7c7cc !important;
          border-radius: 18px !important;
          box-shadow: none !important;
          outline: none !important;
          background: rgba(255,255,255,0.4) !important;
        }
        :global(.signup-input:hover),
        :global(.signup-input:focus),
        :global(.signup-input:focus-visible) {
          border-color: #a3a3a3 !important;
          box-shadow: none !important;
          background: rgba(255,255,255,0.45) !important;
        }
        /* 密码/确认密码：单一浅灰外边框 + 圆角，去除阴影 */
        :global(.signup-password.ant-input-affix-wrapper),
        :global(.signup-confirm.ant-input-affix-wrapper) {
          border: 1px solid #c7c7cc !important;
          box-shadow: none !important;
          outline: none !important;
          border-radius: 18px !important;
          background: rgba(255,255,255,0.4) !important;
        }
        :global(.signup-password.ant-input-affix-wrapper:hover),
        :global(.signup-password.ant-input-affix-wrapper-focused),
        :global(.signup-password:focus-within),
        :global(.signup-confirm.ant-input-affix-wrapper:hover),
        :global(.signup-confirm.ant-input-affix-wrapper-focused),
        :global(.signup-confirm:focus-within) {
          border-color: #a3a3a3 !important;
          box-shadow: none !important;
          background: rgba(255,255,255,0.45) !important;
        }
        :global(.signup-password input),
        :global(.signup-confirm input) {
          background: transparent !important;
          border: none !important;
          box-shadow: none !important;
          outline: none !important;
        }
      `}</style>
    </div>
  )
}