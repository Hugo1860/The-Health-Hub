'use client';

import { useState, useEffect } from 'react';
import { Card, Badge, List, Button, Typography, Space, Collapse, Tag, Alert } from 'antd';
import { 
  BugOutlined, 
  ClearOutlined, 
  ReloadOutlined,
  WarningOutlined,
  InfoCircleOutlined 
} from '@ant-design/icons';
import { StaticBoundaryChecker } from '../lib/static-boundary';

const { Title, Text, Paragraph } = Typography;
const { Panel } = Collapse;

interface StaticBoundaryDevToolsProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxViolations?: number;
}

/**
 * 静态边界开发工具组件
 * 用于在开发环境中监控和调试静态边界违规
 */
export default function StaticBoundaryDevTools({
  autoRefresh = true,
  refreshInterval = 5000,
  maxViolations = 50
}: StaticBoundaryDevToolsProps) {
  const [violations, setViolations] = useState(StaticBoundaryChecker.getViolations());
  const [summary, setSummary] = useState(StaticBoundaryChecker.getViolationSummary());

  // 刷新数据
  const refreshData = () => {
    setViolations(StaticBoundaryChecker.getViolations());
    setSummary(StaticBoundaryChecker.getViolationSummary());
  };

  // 清除违规记录
  const clearViolations = () => {
    StaticBoundaryChecker.clearViolations();
    refreshData();
  };

  // 自动刷新
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(refreshData, refreshInterval);
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval]);

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN');
  };

  // 获取违规类型的颜色
  const getViolationColor = (violation: string) => {
    if (violation.includes('Context')) return 'red';
    if (violation.includes('Hook')) return 'orange';
    if (violation.includes('Runtime')) return 'purple';
    return 'blue';
  };

  // 只在开发环境显示
  if (process.env.NODE_ENV !== 'development') {
    return null;
  }

  return (
    <Card
      title={
        <Space>
          <BugOutlined />
          <span>静态边界检查器</span>
          <Badge count={summary.total} showZero />
        </Space>
      }
      extra={
        <Space>
          <Button 
            icon={<ReloadOutlined />} 
            onClick={refreshData}
            size="small"
          >
            刷新
          </Button>
          <Button 
            icon={<ClearOutlined />} 
            onClick={clearViolations}
            size="small"
            danger
          >
            清除
          </Button>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {summary.total === 0 ? (
        <Alert
          message="没有发现静态边界违规"
          description="所有组件都正确遵循了静态/动态边界规则"
          type="success"
          showIcon
          icon={<InfoCircleOutlined />}
        />
      ) : (
        <Space direction="vertical" style={{ width: '100%' }}>
          {/* 统计摘要 */}
          <Alert
            message={`发现 ${summary.total} 个静态边界违规`}
            description={`最近 1 分钟内有 ${summary.recent.length} 个新违规`}
            type="warning"
            showIcon
            icon={<WarningOutlined />}
          />

          {/* 按组件分组的违规统计 */}
          <Collapse size="small">
            <Panel header="按组件统计" key="summary">
              <List
                size="small"
                dataSource={Object.entries(summary.byComponent)}
                renderItem={([component, count]) => (
                  <List.Item>
                    <Space>
                      <Text strong>{component}</Text>
                      <Badge count={count} />
                    </Space>
                  </List.Item>
                )}
              />
            </Panel>
          </Collapse>

          {/* 最近的违规列表 */}
          <div>
            <Title level={5}>最近的违规 ({Math.min(violations.length, maxViolations)})</Title>
            <List
              size="small"
              dataSource={violations.slice(-maxViolations).reverse()}
              renderItem={(violation, index) => (
                <List.Item>
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color={getViolationColor(violation.violation)}>
                          {violation.component}
                        </Tag>
                        <Text type="secondary">{formatTime(violation.timestamp)}</Text>
                      </Space>
                    }
                    description={
                      <div>
                        <Paragraph style={{ marginBottom: 8 }}>
                          {violation.violation}
                        </Paragraph>
                        {violation.stack && (
                          <Collapse size="small">
                            <Panel header="查看堆栈跟踪" key="stack">
                              <pre style={{ 
                                fontSize: '12px', 
                                background: '#f5f5f5', 
                                padding: '8px',
                                overflow: 'auto',
                                maxHeight: '200px'
                              }}>
                                {violation.stack}
                              </pre>
                            </Panel>
                          </Collapse>
                        )}
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </div>

          {/* 使用建议 */}
          <Collapse size="small">
            <Panel header="修复建议" key="suggestions">
              <Space direction="vertical">
                <Alert
                  message="Context 违规"
                  description="使用 safeUseContext 替代 useContext，或将组件标记为 'use client'"
                  type="info"
                  showIcon
                />
                <Alert
                  message="Hook 违规"
                  description="使用 withStaticSafety 包装 Hook，或确保 Hook 只在客户端组件中使用"
                  type="info"
                  showIcon
                />
                <Alert
                  message="Runtime 错误"
                  description="检查组件是否正确处理了服务端和客户端的差异"
                  type="info"
                  showIcon
                />
              </Space>
            </Panel>
          </Collapse>
        </Space>
      )}
    </Card>
  );
}