'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Card, Row, Col, Statistic, Progress, Table, Tag, Button, Space, Alert, Tabs } from 'antd';
import { 
  DashboardOutlined, 
  ThunderboltOutlined, 
  ClockCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ReloadOutlined,
  DatabaseOutlined
} from '@ant-design/icons';

const { TabPane } = Tabs;

interface PerformanceMetrics {
  database: {
    connectionPool: any;
    queryCache: any;
    audioCache: any;
    userCache: any;
    slowQueries: any[];
    indexUsage: any[];
  };
  health: {
    healthy: boolean;
    issues: string[];
    recommendations: string[];
  };
  performanceTests: any[];
}

interface SystemStats {
  memoryUsage: number;
  cpuUsage: number;
  responseTime: number;
  throughput: number;
  errorRate: number;
  cacheHitRate: number;
}

export const PerformanceDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null);
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  // 获取性能指标
  const fetchMetrics = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/database/stats');
      const data = await response.json();
      
      if (data.success) {
        setMetrics(data.data);
        setLastUpdate(new Date());
      }
    } catch (error) {
      console.error('Failed to fetch performance metrics:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // 获取系统统计
  const fetchSystemStats = useCallback(async () => {
    try {
      // 模拟系统统计数据
      const stats: SystemStats = {
        memoryUsage: Math.random() * 100,
        cpuUsage: Math.random() * 100,
        responseTime: 50 + Math.random() * 200,
        throughput: 100 + Math.random() * 500,
        errorRate: Math.random() * 5,
        cacheHitRate: 70 + Math.random() * 30
      };
      setSystemStats(stats);
    } catch (error) {
      console.error('Failed to fetch system stats:', error);
    }
  }, []);

  // 初始加载和定时刷新
  useEffect(() => {
    fetchMetrics();
    fetchSystemStats();
    
    const interval = setInterval(() => {
      fetchSystemStats();
    }, 5000); // 每5秒更新系统统计
    
    return () => clearInterval(interval);
  }, [fetchMetrics, fetchSystemStats]);

  // 渲染系统概览
  const renderSystemOverview = () => {
    if (!systemStats) return null;

    return (
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="内存使用率"
              value={systemStats.memoryUsage}
              precision={1}
              suffix="%"
              prefix={<DatabaseOutlined />}
              valueStyle={{ 
                color: systemStats.memoryUsage > 80 ? '#cf1322' : 
                       systemStats.memoryUsage > 60 ? '#fa8c16' : '#3f8600' 
              }}
            />
            <Progress 
              percent={systemStats.memoryUsage} 
              size="small" 
              status={systemStats.memoryUsage > 80 ? 'exception' : 'normal'}
              showInfo={false}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="CPU使用率"
              value={systemStats.cpuUsage}
              precision={1}
              suffix="%"
              prefix={<ThunderboltOutlined />}
              valueStyle={{ 
                color: systemStats.cpuUsage > 80 ? '#cf1322' : 
                       systemStats.cpuUsage > 60 ? '#fa8c16' : '#3f8600' 
              }}
            />
            <Progress 
              percent={systemStats.cpuUsage} 
              size="small" 
              status={systemStats.cpuUsage > 80 ? 'exception' : 'normal'}
              showInfo={false}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="平均响应时间"
              value={systemStats.responseTime}
              precision={0}
              suffix="ms"
              prefix={<ClockCircleOutlined />}
              valueStyle={{ 
                color: systemStats.responseTime > 200 ? '#cf1322' : 
                       systemStats.responseTime > 100 ? '#fa8c16' : '#3f8600' 
              }}
            />
          </Card>
        </Col>
        
        <Col span={6}>
          <Card>
            <Statistic
              title="缓存命中率"
              value={systemStats.cacheHitRate}
              precision={1}
              suffix="%"
              valueStyle={{ 
                color: systemStats.cacheHitRate < 60 ? '#cf1322' : 
                       systemStats.cacheHitRate < 80 ? '#fa8c16' : '#3f8600' 
              }}
            />
            <Progress 
              percent={systemStats.cacheHitRate} 
              size="small" 
              status={systemStats.cacheHitRate < 60 ? 'exception' : 'normal'}
              showInfo={false}
            />
          </Card>
        </Col>
      </Row>
    );
  };

  // 渲染数据库性能
  const renderDatabasePerformance = () => {
    if (!metrics) return null;

    const { database } = metrics;
    
    const connectionPoolColumns = [
      { title: '指标', dataIndex: 'metric', key: 'metric' },
      { title: '当前值', dataIndex: 'current', key: 'current' },
      { title: '最大值', dataIndex: 'max', key: 'max' },
      { title: '状态', dataIndex: 'status', key: 'status', render: (status: string) => (
        <Tag color={status === 'healthy' ? 'green' : status === 'warning' ? 'orange' : 'red'}>
          {status}
        </Tag>
      )}
    ];

    const connectionPoolData = [
      {
        key: '1',
        metric: '总连接数',
        current: database.connectionPool?.totalConnections || 0,
        max: 10,
        status: (database.connectionPool?.totalConnections || 0) > 8 ? 'warning' : 'healthy'
      },
      {
        key: '2',
        metric: '活跃连接数',
        current: database.connectionPool?.activeConnections || 0,
        max: 10,
        status: (database.connectionPool?.activeConnections || 0) > 8 ? 'warning' : 'healthy'
      },
      {
        key: '3',
        metric: '空闲连接数',
        current: database.connectionPool?.idleConnections || 0,
        max: 10,
        status: 'healthy'
      },
      {
        key: '4',
        metric: '等待请求数',
        current: database.connectionPool?.waitingRequests || 0,
        max: 5,
        status: (database.connectionPool?.waitingRequests || 0) > 3 ? 'critical' : 'healthy'
      }
    ];

    const cacheColumns = [
      { title: '缓存类型', dataIndex: 'type', key: 'type' },
      { title: '命中次数', dataIndex: 'hits', key: 'hits' },
      { title: '未命中次数', dataIndex: 'misses', key: 'misses' },
      { title: '命中率', dataIndex: 'hitRate', key: 'hitRate', render: (rate: number) => (
        <span style={{ color: rate > 80 ? '#3f8600' : rate > 60 ? '#fa8c16' : '#cf1322' }}>
          {(rate * 100).toFixed(1)}%
        </span>
      )},
      { title: '大小', dataIndex: 'size', key: 'size' }
    ];

    const cacheData = [
      {
        key: '1',
        type: '查询缓存',
        hits: database.queryCache?.hits || 0,
        misses: database.queryCache?.misses || 0,
        hitRate: database.queryCache?.hitRate || 0,
        size: database.queryCache?.size || 0
      },
      {
        key: '2',
        type: '音频缓存',
        hits: database.audioCache?.hits || 0,
        misses: database.audioCache?.misses || 0,
        hitRate: database.audioCache?.hitRate || 0,
        size: database.audioCache?.size || 0
      },
      {
        key: '3',
        type: '用户缓存',
        hits: database.userCache?.hits || 0,
        misses: database.userCache?.misses || 0,
        hitRate: database.userCache?.hitRate || 0,
        size: database.userCache?.size || 0
      }
    ];

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="连接池状态" size="small">
          <Table 
            columns={connectionPoolColumns} 
            dataSource={connectionPoolData} 
            pagination={false}
            size="small"
          />
        </Card>
        
        <Card title="缓存性能" size="small">
          <Table 
            columns={cacheColumns} 
            dataSource={cacheData} 
            pagination={false}
            size="small"
          />
        </Card>
      </Space>
    );
  };

  // 渲染慢查询
  const renderSlowQueries = () => {
    if (!metrics || !metrics.database.slowQueries.length) {
      return (
        <Card title="慢查询监控" size="small">
          <Alert message="暂无慢查询记录" type="success" showIcon />
        </Card>
      );
    }

    const columns = [
      { 
        title: '查询', 
        dataIndex: 'query', 
        key: 'query',
        ellipsis: true,
        width: '40%'
      },
      { 
        title: '平均执行时间', 
        dataIndex: 'avgExecutionTime', 
        key: 'avgExecutionTime',
        render: (time: number) => `${time.toFixed(2)}ms`
      },
      { 
        title: '执行次数', 
        dataIndex: 'count', 
        key: 'count'
      },
      { 
        title: '最后执行', 
        dataIndex: 'lastSeen', 
        key: 'lastSeen',
        render: (date: string) => new Date(date).toLocaleString()
      }
    ];

    return (
      <Card title="慢查询监控" size="small">
        <Table 
          columns={columns} 
          dataSource={metrics.database.slowQueries} 
          pagination={{ pageSize: 5 }}
          size="small"
        />
      </Card>
    );
  };

  // 渲染性能测试结果
  const renderPerformanceTests = () => {
    if (!metrics || !metrics.performanceTests.length) return null;

    const columns = [
      { title: '测试名称', dataIndex: 'name', key: 'name' },
      { 
        title: '执行时间', 
        dataIndex: 'executionTime', 
        key: 'executionTime',
        render: (time: number) => `${time}ms`
      },
      { 
        title: '状态', 
        dataIndex: 'status', 
        key: 'status',
        render: (status: string) => (
          <Tag color={status === 'success' ? 'green' : 'red'}>
            {status === 'success' ? '成功' : '失败'}
          </Tag>
        )
      }
    ];

    return (
      <Card title="性能测试结果" size="small">
        <Table 
          columns={columns} 
          dataSource={metrics.performanceTests} 
          pagination={false}
          size="small"
        />
      </Card>
    );
  };

  // 渲染健康状态
  const renderHealthStatus = () => {
    if (!metrics) return null;

    const { health } = metrics;

    return (
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="系统健康状态" size="small">
          <Alert
            message={health.healthy ? "系统运行正常" : "系统存在问题"}
            type={health.healthy ? "success" : "warning"}
            icon={health.healthy ? <CheckCircleOutlined /> : <WarningOutlined />}
            showIcon
          />
        </Card>

        {health.issues.length > 0 && (
          <Card title="发现的问题" size="small">
            <ul>
              {health.issues.map((issue, index) => (
                <li key={index} style={{ color: '#fa8c16', marginBottom: 8 }}>
                  <WarningOutlined style={{ marginRight: 8 }} />
                  {issue}
                </li>
              ))}
            </ul>
          </Card>
        )}

        {health.recommendations.length > 0 && (
          <Card title="优化建议" size="small">
            <ul>
              {health.recommendations.map((recommendation, index) => (
                <li key={index} style={{ marginBottom: 8 }}>
                  💡 {recommendation}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </Space>
    );
  };

  return (
    <div className="performance-dashboard">
      <Card 
        title={
          <Space>
            <DashboardOutlined />
            性能监控仪表板
          </Space>
        }
        extra={
          <Space>
            {lastUpdate && (
              <span style={{ fontSize: '12px', color: '#666' }}>
                最后更新: {lastUpdate.toLocaleTimeString()}
              </span>
            )}
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchMetrics}
              loading={loading}
              size="small"
            >
              刷新
            </Button>
          </Space>
        }
      >
        <Tabs defaultActiveKey="overview">
          <TabPane tab="系统概览" key="overview">
            {renderSystemOverview()}
          </TabPane>
          
          <TabPane tab="数据库性能" key="database">
            {renderDatabasePerformance()}
          </TabPane>
          
          <TabPane tab="慢查询" key="slow-queries">
            {renderSlowQueries()}
          </TabPane>
          
          <TabPane tab="性能测试" key="performance-tests">
            {renderPerformanceTests()}
          </TabPane>
          
          <TabPane tab="健康状态" key="health">
            {renderHealthStatus()}
          </TabPane>
        </Tabs>
      </Card>
    </div>
  );
};

export default PerformanceDashboard;