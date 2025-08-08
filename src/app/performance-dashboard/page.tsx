'use client';

import React from 'react';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import { Typography, Space } from 'antd';

const { Title, Paragraph } = Typography;

export default function PerformanceDashboardPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>性能监控中心</Title>
          <Paragraph type="secondary">
            实时监控系统性能指标，包括数据库连接池、缓存命中率、查询性能等关键指标。
          </Paragraph>
        </div>
        
        <PerformanceDashboard />
      </Space>
    </div>
  );
}