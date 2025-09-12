'use client';

import { useState, useEffect } from 'react';
import { Card, Table, Tag, Button, Space, Statistic, Row, Col, Alert, Tabs, Typography } from 'antd';
import { 
  ExclamationCircleOutlined, 
  WarningOutlined, 
  InfoCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DeleteOutlined
} from '@ant-design/icons';
import { useErrorLogger } from '../lib/errorLogger';
import type { ErrorLogEntry, PerformanceMetric, UserAction } from '../lib/errorLogger';

const { Title, Text } = Typography;
// 移除过时的 TabPane 导入

interface ErrorMonitorDashboardProps {
  showControls?: boolean;
  maxHeight?: number;
}

export default function ErrorMonitorDashboard({ 
  showControls = true, 
  maxHeight = 600 
}: ErrorMonitorDashboardProps) {
  const { 
    getLogs, 
    getMetrics, 
    getUserActions, 
    exportLogs, 
    clearLogs 
  } = useErrorLogger();

  const [logs, setLogs] = useState<ErrorLogEntry[]>([]);
  const [metrics, setMetrics] = useState<PerformanceMetric[]>([]);
  const [actions, setActions] = useState<UserAction[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const refreshData = () => {
    setRefreshing(true);
    setLogs(getLogs());
    setMetrics(getMetrics());
    setActions(getUserActions());
    setTimeout(() => setRefreshing(false), 500);
  };

  useEffect(() => {
    refreshData();
    
    // 定期刷新数据
    const interval = setInterval(refreshData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleExport = () => {
    const data = exportLogs();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `error-logs-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleClear = () => {
    clearLogs();
    refreshData();
  };

  // 统计数据
  const errorCount = logs.filter(log => log.level === 'error').length;
  const warningCount = logs.filter(log => log.level === 'warn').length;
  const infoCount = logs.filter(log => log.level === 'info').length;
  const avgResponseTime = metrics
    .filter(m => m.name.includes('api_response_time'))
    .reduce((sum, m, _, arr) => sum + m.value / arr.length, 0);

  // 错误日志表格列
  const errorColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (timestamp: string) => new Date(timestamp).toLocaleString('zh-CN')
    },
    {
      title: '级别',
      dataIndex: 'level',
      key: 'level',
      width: 80,
      render: (level: string) => {
        const colors = {
          error: 'red',
          warn: 'orange',
          info: 'blue',
          debug: 'gray'
        };
        const icons = {
          error: <ExclamationCircleOutlined />,
          warn: <WarningOutlined />,
          info: <InfoCircleOutlined />,
          debug: <InfoCircleOutlined />
        };
        return (
          <Tag color={colors[level as keyof typeof colors]} icon={icons[level as keyof typeof icons]}>
            {level.toUpperCase()}
          </Tag>
        );
      }
    },
    {
      title: '组件',
      dataIndex: 'component',
      key: 'component',
      width: 120,
      render: (component: string) => component ? <Tag>{component}</Tag> : '-'
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true
    },
    {
      title: '操作',
      key: 'action',
      width: 100,
      render: (_: any, record: ErrorLogEntry) => (
        <Button 
          size="small" 
          type="link"
          onClick={() => {
            console.log('Error details:', record);
            alert(`错误详情:\n${JSON.stringify(record, null, 2)}`);
          }}
        >
          详情
        </Button>
      )
    }
  ];

  // 性能指标表格列
  const metricColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (timestamp: string) => new Date(timestamp).toLocaleString('zh-CN')
    },
    {
      title: '指标名称',
      dataIndex: 'name',
      key: 'name',
      width: 200
    },
    {
      title: '值',
      dataIndex: 'value',
      key: 'value',
      width: 100,
      render: (value: number, record: PerformanceMetric) => `${value.toFixed(2)} ${record.unit}`
    },
    {
      title: '上下文',
      dataIndex: 'context',
      key: 'context',
      ellipsis: true,
      render: (context: any) => context ? JSON.stringify(context) : '-'
    }
  ];

  // 用户操作表格列
  const actionColumns = [
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 160,
      render: (timestamp: string) => new Date(timestamp).toLocaleString('zh-CN')
    },
    {
      title: '组件',
      dataIndex: 'component',
      key: 'component',
      width: 120,
      render: (component: string) => <Tag color="blue">{component}</Tag>
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      width: 120
    },
    {
      title: '数据',
      dataIndex: 'data',
      key: 'data',
      ellipsis: true,
      render: (data: any) => data ? JSON.stringify(data) : '-'
    }
  ];

  return (
    <div style={{ padding: '16px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Title level={3} style={{ margin: 0 }}>错误监控仪表盘</Title>
        {showControls && (
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={refreshData}
              loading={refreshing}
            >
              刷新
            </Button>
            <Button 
              icon={<DownloadOutlined />} 
              onClick={handleExport}
            >
              导出日志
            </Button>
            <Button 
              icon={<DeleteOutlined />} 
              onClick={handleClear}
              danger
            >
              清空日志
            </Button>
          </Space>
        )}
      </div>

      {/* 统计概览 */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="错误数量"
              value={errorCount}
              prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
              valueStyle={{ color: errorCount > 0 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="警告数量"
              value={warningCount}
              prefix={<WarningOutlined style={{ color: '#faad14' }} />}
              valueStyle={{ color: warningCount > 0 ? '#faad14' : '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="信息数量"
              value={infoCount}
              prefix={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={avgResponseTime.toFixed(0)}
              suffix="ms"
              valueStyle={{ color: avgResponseTime > 1000 ? '#ff4d4f' : '#52c41a' }}
            />
          </Card>
        </Col>
      </Row>

      {/* 严重错误提醒 */}
      {errorCount > 0 && (
        <Alert
          message={`检测到 ${errorCount} 个错误`}
          description="请及时查看错误详情并进行处理"
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {/* 详细数据表格 */}
      <Tabs 
        defaultActiveKey="errors"
        items={[
          {
            key: 'errors',
            label: `错误日志 (${logs.length})`,
            children: (
              <Table
                columns={errorColumns}
                dataSource={logs}
                rowKey="id"
                size="small"
                scroll={{ y: maxHeight - 200 }}
                pagination={{ pageSize: 50, showSizeChanger: true }}
              />
            )
          },
          {
            key: 'metrics',
            label: `性能指标 (${metrics.length})`,
            children: (
              <Table
                columns={metricColumns}
                dataSource={metrics}
                rowKey="id"
                size="small"
                scroll={{ y: maxHeight - 200 }}
                pagination={{ pageSize: 50, showSizeChanger: true }}
              />
            )
          },
          {
            key: 'actions',
            label: `用户操作 (${actions.length})`,
            children: (
              <Table
                columns={actionColumns}
                dataSource={actions}
                rowKey="id"
                size="small"
                scroll={{ y: maxHeight - 200 }}
                pagination={{ pageSize: 50, showSizeChanger: true }}
              />
            )
          }
        ]}
      />
    </div>
  );
}