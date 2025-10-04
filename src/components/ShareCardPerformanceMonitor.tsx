'use client'

import React, { useState, useEffect } from 'react';
import { Card, Statistic, Row, Col, Progress, Button, Space, Typography, Alert } from 'antd';
import { ReloadOutlined, ClearOutlined, InfoCircleOutlined } from '@ant-design/icons';
import { ShareCardService } from '@/lib/share-card-service';
import { MemoryManager } from '@/lib/memory-manager';

const { Text, Title } = Typography;

export interface ShareCardPerformanceMonitorProps {
  visible?: boolean;
}

export const ShareCardPerformanceMonitor: React.FC<ShareCardPerformanceMonitorProps> = ({
  visible = false
}) => {
  const [stats, setStats] = useState<any>(null);
  const [recommendations, setRecommendations] = useState<string[]>([]);

  const refreshStats = () => {
    const performanceStats = ShareCardService.getPerformanceStats();
    const memoryManager = MemoryManager.getInstance();
    const memoryRecommendations = memoryManager.getMemoryRecommendations();
    
    setStats(performanceStats);
    setRecommendations(memoryRecommendations);
  };

  const handleCleanup = () => {
    ShareCardService.cleanup();
    refreshStats();
  };

  useEffect(() => {
    if (visible) {
      refreshStats();
      
      // 定期刷新统计信息
      const interval = setInterval(refreshStats, 5000);
      return () => clearInterval(interval);
    }
  }, [visible]);

  if (!visible || !stats) {
    return null;
  }

  const memoryUsagePercent = stats.memory.usedJSHeapSize && stats.memory.jsHeapSizeLimit
    ? Math.round((stats.memory.usedJSHeapSize / stats.memory.jsHeapSizeLimit) * 100)
    : 0;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Card
      title={
        <Space>
          <InfoCircleOutlined />
          <span>性能监控</span>
        </Space>
      }
      extra={
        <Space>
          <Button icon={<ReloadOutlined />} onClick={refreshStats} size="small">
            刷新
          </Button>
          <Button icon={<ClearOutlined />} onClick={handleCleanup} size="small">
            清理
          </Button>
        </Space>
      }
      size="small"
    >
      {/* 内存使用情况 */}
      <Title level={5}>内存使用</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="JS 堆内存"
            value={stats.memory.usedJSHeapSize ? formatBytes(stats.memory.usedJSHeapSize) : 'N/A'}
            suffix={stats.memory.jsHeapSizeLimit ? `/ ${formatBytes(stats.memory.jsHeapSizeLimit)}` : ''}
          />
          {memoryUsagePercent > 0 && (
            <Progress
              percent={memoryUsagePercent}
              size="small"
              status={memoryUsagePercent > 80 ? 'exception' : memoryUsagePercent > 60 ? 'active' : 'success'}
            />
          )}
        </Col>
        <Col span={8}>
          <Statistic
            title="图片内存估算"
            value={formatBytes(stats.memory.estimatedImageMemory)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Blob URLs"
            value={stats.memory.blobUrls}
          />
        </Col>
      </Row>

      {/* Canvas 池状态 */}
      <Title level={5} style={{ marginTop: 16 }}>Canvas 池</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="池大小"
            value={stats.canvas.poolSize}
            suffix={`/ ${stats.canvas.maxSize}`}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="使用中"
            value={stats.canvas.inUseCount}
          />
        </Col>
        <Col span={8}>
          <Progress
            percent={Math.round((stats.canvas.poolSize / stats.canvas.maxSize) * 100)}
            size="small"
            format={() => `${stats.canvas.poolSize}/${stats.canvas.maxSize}`}
          />
        </Col>
      </Row>

      {/* 图片缓存状态 */}
      <Title level={5} style={{ marginTop: 16 }}>图片缓存</Title>
      <Row gutter={16}>
        <Col span={8}>
          <Statistic
            title="缓存大小"
            value={stats.imageCache.cacheSize}
            suffix={`/ ${stats.imageCache.maxSize}`}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="总大小"
            value={formatBytes(stats.imageCache.totalSize)}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="命中率"
            value={Math.round(stats.imageCache.hitRate * 100)}
            suffix="%"
          />
        </Col>
      </Row>

      {/* 性能建议 */}
      {recommendations.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <Title level={5}>性能建议</Title>
          <Alert
            message="优化建议"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {recommendations.map((rec, index) => (
                  <li key={index}>{rec}</li>
                ))}
              </ul>
            }
            type="info"
            showIcon
          />
        </div>
      )}
    </Card>
  );
};

export default ShareCardPerformanceMonitor;