/**
 * 分类统计信息组件
 * 提供详细的分类层级统计和健康状态分析
 */

import React, { useMemo } from 'react';
import { Card, Space, Typography, Tag, Progress, Row, Col, Statistic, Alert } from 'antd';
import { 
  DatabaseOutlined, 
  FolderOutlined, 
  FileOutlined, 
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  SoundOutlined
} from '@ant-design/icons';
import { Category } from '@/types/category';

const { Text, Title } = Typography;

interface CategoryStatisticsProps {
  categories: Category[];
  selectedCount?: number;
}

interface CategoryStats {
  total: number;
  level1: number;
  level2: number;
  active: number;
  inactive: number;
  withAudio: number;
  withoutAudio: number;
  level1WithChildren: number;
  level1WithoutChildren: number;
  orphaned: number;
  inconsistent: number;
  totalAudioCount: number;
  averageAudioPerCategory: number;
  healthScore: number;
}

export const CategoryStatistics: React.FC<CategoryStatisticsProps> = ({ 
  categories, 
  selectedCount = 0 
}) => {
  const stats = useMemo((): CategoryStats => {
    const level1Categories = categories.filter(c => c.level === 1);
    const level2Categories = categories.filter(c => c.level === 2);
    const activeCategories = categories.filter(c => c.isActive !== false);
    const categoriesWithAudio = categories.filter(c => (c.audioCount || 0) > 0);
    
    // 计算有子分类的一级分类
    const level1WithChildren = level1Categories.filter(cat => 
      level2Categories.some(sub => sub.parentId === cat.id)
    );
    
    // 计算孤立分类（有parentId但父分类不存在）
    const orphanedCategories = categories.filter(c => 
      c.parentId && !categories.some(parent => parent.id === c.parentId)
    );
    
    // 计算层级不一致的分类
    const inconsistentCategories = categories.filter(c => 
      (c.level === 1 && c.parentId) || (c.level === 2 && !c.parentId)
    );
    
    // 计算总音频数量
    const totalAudioCount = categories.reduce((sum, cat) => sum + (cat.audioCount || 0), 0);
    
    // 计算健康分数 (0-100)
    let healthScore = 100;
    if (orphanedCategories.length > 0) healthScore -= orphanedCategories.length * 10;
    if (inconsistentCategories.length > 0) healthScore -= inconsistentCategories.length * 15;
    if (level2Categories.length === 0 && level1Categories.length > 0) healthScore -= 20;
    healthScore = Math.max(0, healthScore);
    
    return {
      total: categories.length,
      level1: level1Categories.length,
      level2: level2Categories.length,
      active: activeCategories.length,
      inactive: categories.length - activeCategories.length,
      withAudio: categoriesWithAudio.length,
      withoutAudio: categories.length - categoriesWithAudio.length,
      level1WithChildren: level1WithChildren.length,
      level1WithoutChildren: level1Categories.length - level1WithChildren.length,
      orphaned: orphanedCategories.length,
      inconsistent: inconsistentCategories.length,
      totalAudioCount,
      averageAudioPerCategory: categories.length > 0 ? totalAudioCount / categories.length : 0,
      healthScore
    };
  }, [categories]);

  const getHealthStatus = (score: number) => {
    if (score >= 90) return { type: 'success' as const, text: '优秀', color: '#52c41a' };
    if (score >= 70) return { type: 'warning' as const, text: '良好', color: '#faad14' };
    if (score >= 50) return { type: 'error' as const, text: '一般', color: '#ff7a45' };
    return { type: 'error' as const, text: '需要改进', color: '#ff4d4f' };
  };

  const healthStatus = getHealthStatus(stats.healthScore);

  return (
    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
      {/* 主要统计信息 */}
      <Card size="small" title="📊 分类统计概览">
        <Row gutter={[16, 16]}>
          <Col xs={12} sm={8} md={6}>
            <Statistic
              title="总分类数"
              value={stats.total}
              prefix={<DatabaseOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic
              title="一级分类"
              value={stats.level1}
              prefix={<FolderOutlined />}
              valueStyle={{ color: '#52c41a' }}
              suffix={stats.level1WithChildren > 0 ? `(${stats.level1WithChildren}个有子分类)` : ''}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic
              title="二级分类"
              value={stats.level2}
              prefix={<FileOutlined />}
              valueStyle={{ 
                color: stats.level2 > 0 ? '#52c41a' : '#ff4d4f' 
              }}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic
              title="激活分类"
              value={stats.active}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#722ed1' }}
              suffix={`/ ${stats.total}`}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic
              title="有音频分类"
              value={stats.withAudio}
              prefix={<SoundOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Col>
          <Col xs={12} sm={8} md={6}>
            <Statistic
              title="总音频数"
              value={stats.totalAudioCount}
              valueStyle={{ color: '#13c2c2' }}
            />
          </Col>
          {selectedCount > 0 && (
            <Col xs={12} sm={8} md={6}>
              <Statistic
                title="已选择"
                value={selectedCount}
                valueStyle={{ color: '#1890ff' }}
                suffix={`/ ${stats.total}`}
              />
            </Col>
          )}
        </Row>
      </Card>

      {/* 健康状态 */}
      <Card size="small" title="🏥 数据健康状态">
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <div>
                <Text strong>整体健康分数</Text>
                <Progress
                  percent={stats.healthScore}
                  status={healthStatus.type === 'success' ? 'success' : 
                          healthStatus.type === 'warning' ? 'active' : 'exception'}
                  strokeColor={healthStatus.color}
                  format={(percent) => `${percent}% ${healthStatus.text}`}
                />
              </div>
            </Space>
          </Col>
          <Col xs={24} sm={12}>
            <Space direction="vertical" size="small">
              {stats.orphaned > 0 && (
                <div>
                  <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                  <Text type="danger" style={{ marginLeft: 8 }}>
                    {stats.orphaned} 个孤立分类
                  </Text>
                </div>
              )}
              {stats.inconsistent > 0 && (
                <div>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <Text type="warning" style={{ marginLeft: 8 }}>
                    {stats.inconsistent} 个层级错误
                  </Text>
                </div>
              )}
              {stats.level2 === 0 && stats.level1 > 0 && (
                <div>
                  <WarningOutlined style={{ color: '#faad14' }} />
                  <Text type="warning" style={{ marginLeft: 8 }}>
                    缺少二级分类
                  </Text>
                </div>
              )}
              {stats.orphaned === 0 && stats.inconsistent === 0 && stats.level2 > 0 && (
                <div>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text type="success" style={{ marginLeft: 8 }}>
                    数据结构完整
                  </Text>
                </div>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* 详细分析 */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Card size="small" title="📁 层级分布">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>一级分类:</Text>
                <Space>
                  <Tag color="blue">{stats.level1}</Tag>
                  <Text type="secondary">
                    ({stats.level1WithChildren}个有子分类)
                  </Text>
                </Space>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>二级分类:</Text>
                <Tag color={stats.level2 > 0 ? 'green' : 'red'}>
                  {stats.level2}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>层级覆盖率:</Text>
                <Text strong>
                  {stats.level1 > 0 ? Math.round((stats.level1WithChildren / stats.level1) * 100) : 0}%
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
        <Col xs={24} sm={12}>
          <Card size="small" title="🎵 音频分布">
            <Space direction="vertical" style={{ width: '100%' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>有音频分类:</Text>
                <Tag color="orange">{stats.withAudio}</Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>空分类:</Text>
                <Tag color={stats.withoutAudio > 0 ? 'default' : 'green'}>
                  {stats.withoutAudio}
                </Tag>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>平均音频数:</Text>
                <Text strong>
                  {stats.averageAudioPerCategory.toFixed(1)}
                </Text>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  );
};

export default CategoryStatistics;