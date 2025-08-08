'use client';

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Space, Typography, Alert, Button } from 'antd';
import { CheckCircleOutlined, ExclamationCircleOutlined, ReloadOutlined } from '@ant-design/icons';
import Logo from '@/components/Logo';

const { Title, Text } = Typography;

export default function TestLogoPage() {
  const [logoStatus, setLogoStatus] = useState<{
    loading: boolean;
    exists: boolean;
    message: string;
  }>({
    loading: true,
    exists: false,
    message: '检查中...'
  });

  useEffect(() => {
    checkLogoStatus();
  }, []);

  const checkLogoStatus = async () => {
    try {
      setLogoStatus(prev => ({ ...prev, loading: true }));
      const response = await fetch('/api/logo');
      const result = await response.json();
      
      if (result.success) {
        setLogoStatus({
          loading: false,
          exists: result.data.logoExists,
          message: result.data.message
        });
      } else {
        setLogoStatus({
          loading: false,
          exists: false,
          message: result.error?.message || '检查失败'
        });
      }
    } catch (error) {
      setLogoStatus({
        loading: false,
        exists: false,
        message: '网络错误'
      });
    }
  };

  return (
    <div style={{ padding: 24, background: '#f5f5f5', minHeight: '100vh' }}>
      <Title level={2} style={{ textAlign: 'center', marginBottom: 32 }}>
        健闻局 Logo 组件测试页面
      </Title>
      
      {/* Logo状态检查 */}
      <Row style={{ marginBottom: 24 }}>
        <Col span={24}>
          <Alert
            message="Logo文件状态"
            description={
              <Space>
                <Text>{logoStatus.message}</Text>
                <Button 
                  size="small" 
                  icon={<ReloadOutlined />} 
                  loading={logoStatus.loading}
                  onClick={checkLogoStatus}
                >
                  重新检查
                </Button>
              </Space>
            }
            type={logoStatus.exists ? 'success' : 'warning'}
            icon={logoStatus.exists ? <CheckCircleOutlined /> : <ExclamationCircleOutlined />}
            showIcon
          />
        </Col>
      </Row>
      
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <Text style={{ color: '#666', fontSize: 16 }}>
          Logo路径: public/uploads/logo.jpg
        </Text>
      </div>
      
      <Row gutter={[24, 24]}>
        {/* 浅色背景测试 */}
        <Col xs={24} md={12}>
          <Card title="浅色背景测试" style={{ height: '100%' }}>
            <Space direction="vertical" size="large" style={{ width: '100%', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4}>大尺寸 (200x60)</Title>
                <Logo size="large" />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <Title level={4}>中等尺寸 (160x50)</Title>
                <Logo size="medium" />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <Title level={4}>小尺寸 (120x40)</Title>
                <Logo size="small" />
              </div>
            </Space>
          </Card>
        </Col>
        
        {/* 深色背景测试 */}
        <Col xs={24} md={12}>
          <Card 
            title="深色背景测试" 
            style={{ 
              height: '100%',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
            }}
            headStyle={{ color: 'white', borderBottom: '1px solid rgba(255,255,255,0.2)' }}
            bodyStyle={{ background: 'transparent' }}
          >
            <Space direction="vertical" size="large" style={{ width: '100%', alignItems: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: 'white' }}>大尺寸</Title>
                <Logo size="large" />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: 'white' }}>中等尺寸</Title>
                <Logo size="medium" />
              </div>
              
              <div style={{ textAlign: 'center' }}>
                <Title level={4} style={{ color: 'white' }}>小尺寸</Title>
                <Logo size="small" />
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
      
      {/* 移动端预览 */}
      <Row style={{ marginTop: 32 }}>
        <Col span={24}>
          <Card title="移动端顶部栏预览">
            <div style={{
              height: 64,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              borderRadius: 8
            }}>
              <div style={{ width: 40, height: 40, background: '#f0f0f0', borderRadius: 8 }} />
              <Logo size="small" />
              <div style={{ width: 40, height: 40, background: '#f0f0f0', borderRadius: '50%' }} />
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}