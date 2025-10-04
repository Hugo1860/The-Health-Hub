'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Progress,
  Alert,
  Space,
  Typography,
  Statistic,
  Row,
  Col,
  Tag,
  Modal,
  message,
  Spin,
  Tabs,
  List,
  Tooltip,
  Badge,
  Switch,
  InputNumber,
  Form,
  App
} from 'antd';
import {
  DashboardOutlined,
  ReloadOutlined,
  ClearOutlined,
  FireOutlined,
  SettingOutlined,
  ThunderboltOutlined,
  ClockCircleOutlined,
  DatabaseOutlined,
  LineChartOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { AntdAdminGuard } from '../../../components/AntdAdminGuard';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface PerformanceStats {
  optimizer: {
    cache: {
      hits: number;
      misses: number;
      size: number;
      hitRate: number;
    };
    queries: Array<{
      queryType: string;
      executionTime: number;
      cacheHit: boolean;
      resultCount: number;
      timestamp: number;
    }>;
    summary: {
      totalQueries: number;
      averageExecutionTime: number;
      cacheHitRate: number;
      slowQueries: Array<{
        queryType: string;
        executionTime: number;
        timestamp: number;
      }>;
    };
  };
  cacheManager: any;
  cacheHealth: any;
  timestamp: string;
}

interface BenchmarkResults {
  results: {
    [key: string]: {
      cold: number;
      warm: number;
    };
  };
  summary: {
    averageColdTime: number;
    averageWarmTime: number;
    cacheEfficiency: number[];
    timestamp: string;
  };
}

function PerformanceMonitoring() {
  const { modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [stats, setStats] = useState<PerformanceStats | null>(null);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkResults | null>(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30);

  useEffect(() => {
    loadStats();
  }, []);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (autoRefresh) {
      interval = setInterval(() => {
        loadStats();
      }, refreshInterval * 1000);
    }

    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [autoRefresh, refreshInterval]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/performance/categories?action=stats');
      const data = await response.json();
      
      if (data.success) {
        setStats(data.data);
      } else {
        message.error(data.error || '获取性能统计失败');
      }
    } catch (error) {
      console.error('获取性能统计失败:', error);
      message.error('获取性能统计失败');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: string, options: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/performance/categories', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          action,
          ...options
        })
      });

      const data = await response.json();
      
      if (data.success) {
        message.success(data.message || '操作成功');
        
        if (action === 'benchmark') {
          setBenchmarkResults(data.data);
        }
        
        // 重新加载统计
        await loadStats();
      } else {
        message.error(data.error || '操作失败');
      }
    } catch (error) {
      console.error(`执行 ${action} 操作失败:`, error);
      message.error('操作失败');
    } finally {
      setLoading(false);
    }
  };

  const handleWarmupCache = () => {
    modal.confirm({
      title: '预热缓存',
      content: '此操作将预热所有常用查询的缓存，可能需要一些时间。确定要继续吗？',
      onOk: () => executeAction('warmup-cache'),
    });
  };

  const handleClearCache = () => {
    modal.confirm({
      title: '清除缓存',
      content: '此操作将清除所有缓存数据，下次查询将重新从数据库获取。确定要继续吗？',
      okType: 'danger',
      onOk: () => executeAction('clear-cache'),
    });
  };

  const handleBenchmark = () => {
    modal.confirm({
      title: '运行性能基准测试',
      content: '此操作将运行一系列性能测试，可能需要较长时间。确定要继续吗？',
      onOk: () => executeAction('benchmark'),
    });
  };

  const getPerformanceColor = (time: number) => {
    if (time < 50) return 'success';
    if (time < 200) return 'warning';
    return 'exception';
  };

  const getCacheHitRateColor = (rate: number) => {
    if (rate > 0.8) return 'success';
    if (rate > 0.5) return 'warning';
    return 'exception';
  };

  const queryColumns = [
    {
      title: '查询类型',
      dataIndex: 'queryType',
      key: 'queryType',
      render: (type: string) => <Tag color="blue">{type}</Tag>
    },
    {
      title: '执行时间',
      dataIndex: 'executionTime',
      key: 'executionTime',
      render: (time: number) => (
        <Tag color={getPerformanceColor(time)}>
          {time}ms
        </Tag>
      ),
      sorter: (a: any, b: any) => a.executionTime - b.executionTime
    },
    {
      title: '缓存命中',
      dataIndex: 'cacheHit',
      key: 'cacheHit',
      render: (hit: boolean) => (
        <Tag color={hit ? 'green' : 'red'}>
          {hit ? '命中' : '未命中'}
        </Tag>
      )
    },
    {
      title: '结果数量',
      dataIndex: 'resultCount',
      key: 'resultCount'
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: number) => new Date(timestamp).toLocaleTimeString()
    }
  ];

  const slowQueryColumns = [
    {
      title: '查询类型',
      dataIndex: 'queryType',
      key: 'queryType',
      render: (type: string) => <Tag color="red">{type}</Tag>
    },
    {
      title: '执行时间',
      dataIndex: 'executionTime',
      key: 'executionTime',
      render: (time: number) => (
        <Text strong style={{ color: '#ff4d4f' }}>
          {time}ms
        </Text>
      )
    },
    {
      title: '时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: number) => new Date(timestamp).toLocaleTimeString()
    }
  ];

  if (loading && !stats) {
    return (
      <AntdAdminLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="加载性能统计..." />
        </div>
      </AntdAdminLayout>
    );
  }

  return (
    <AntdAdminLayout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            分类性能监控
          </Title>
          <Space>
            <Space>
              <Text>自动刷新:</Text>
              <Switch 
                checked={autoRefresh} 
                onChange={setAutoRefresh}
                size="small"
              />
              {autoRefresh && (
                <InputNumber
                  min={5}
                  max={300}
                  value={refreshInterval}
                  onChange={(value) => setRefreshInterval(value || 30)}
                  addonAfter="秒"
                  size="small"
                  style={{ width: 80 }}
                />
              )}
            </Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadStats}
              loading={loading}
            >
              刷新
            </Button>
          </Space>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="概览" key="overview">
            {stats && (
              <>
                {/* 核心指标 */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="总查询数"
                        value={stats.optimizer.summary.totalQueries}
                        prefix={<DatabaseOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="平均响应时间"
                        value={Math.round(stats.optimizer.summary.averageExecutionTime)}
                        suffix="ms"
                        prefix={<ClockCircleOutlined />}
                        valueStyle={{ 
                          color: getPerformanceColor(stats.optimizer.summary.averageExecutionTime) === 'success' ? '#52c41a' : 
                                 getPerformanceColor(stats.optimizer.summary.averageExecutionTime) === 'warning' ? '#faad14' : '#ff4d4f'
                        }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="缓存命中率"
                        value={Math.round(stats.optimizer.cache.hitRate * 100)}
                        suffix="%"
                        prefix={<ThunderboltOutlined />}
                        valueStyle={{ 
                          color: getCacheHitRateColor(stats.optimizer.cache.hitRate) === 'success' ? '#52c41a' : 
                                 getCacheHitRateColor(stats.optimizer.cache.hitRate) === 'warning' ? '#faad14' : '#ff4d4f'
                        }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="缓存大小"
                        value={stats.optimizer.cache.size}
                        prefix={<DatabaseOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 缓存性能 */}
                <Card title="缓存性能" style={{ marginBottom: 24 }}>
                  <Row gutter={16}>
                    <Col span={12}>
                      <Progress
                        type="circle"
                        percent={Math.round(stats.optimizer.cache.hitRate * 100)}
                        status={getCacheHitRateColor(stats.optimizer.cache.hitRate)}
                        format={(percent) => `${percent}%`}
                      />
                      <div style={{ textAlign: 'center', marginTop: 8 }}>
                        <Text strong>缓存命中率</Text>
                      </div>
                    </Col>
                    <Col span={12}>
                      <Space direction="vertical" style={{ width: '100%' }}>
                        <div>
                          <Text>缓存命中: </Text>
                          <Tag color="green">{stats.optimizer.cache.hits}</Tag>
                        </div>
                        <div>
                          <Text>缓存未命中: </Text>
                          <Tag color="red">{stats.optimizer.cache.misses}</Tag>
                        </div>
                        <div>
                          <Text>缓存条目: </Text>
                          <Tag color="blue">{stats.optimizer.cache.size}</Tag>
                        </div>
                      </Space>
                    </Col>
                  </Row>
                </Card>

                {/* 操作按钮 */}
                <Card title="缓存操作" style={{ marginBottom: 24 }}>
                  <Space wrap>
                    <Button
                      type="primary"
                      icon={<FireOutlined />}
                      onClick={handleWarmupCache}
                      loading={loading}
                    >
                      预热缓存
                    </Button>
                    <Button
                      icon={<ClearOutlined />}
                      onClick={handleClearCache}
                      loading={loading}
                      danger
                    >
                      清除缓存
                    </Button>
                    <Button
                      icon={<LineChartOutlined />}
                      onClick={handleBenchmark}
                      loading={loading}
                    >
                      性能基准测试
                    </Button>
                  </Space>
                </Card>

                {/* 慢查询警告 */}
                {stats.optimizer.summary.slowQueries.length > 0 && (
                  <Alert
                    message={`发现 ${stats.optimizer.summary.slowQueries.length} 个慢查询`}
                    description="建议检查慢查询并考虑优化"
                    type="warning"
                    showIcon
                    style={{ marginBottom: 24 }}
                  />
                )}
              </>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane 
            tab={
              <Badge count={stats?.optimizer.summary.slowQueries.length || 0} size="small">
                <span>慢查询</span>
              </Badge>
            } 
            key="slow-queries"
          >
            {stats && stats.optimizer.summary.slowQueries.length > 0 ? (
              <Card title={`慢查询列表 (>${100}ms)`}>
                <Table
                  columns={slowQueryColumns}
                  dataSource={stats.optimizer.summary.slowQueries}
                  rowKey={(record, index) => `${record.queryType}-${index}`}
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                  }}
                />
              </Card>
            ) : (
              <Card>
                <Alert
                  message="性能良好"
                  description="未发现慢查询"
                  type="success"
                  showIcon
                />
              </Card>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab="查询历史" key="query-history">
            {stats && (
              <Card title="最近查询">
                <Table
                  columns={queryColumns}
                  dataSource={stats.optimizer.queries}
                  rowKey={(record, index) => `${record.queryType}-${index}`}
                  pagination={{
                    pageSize: 20,
                    showSizeChanger: true,
                  }}
                />
              </Card>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab="基准测试" key="benchmark">
            {benchmarkResults ? (
              <Card title="性能基准测试结果">
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col span={8}>
                    <Statistic 
                      title="平均冷启动时间" 
                      value={Math.round(benchmarkResults.summary.averageColdTime)}
                      suffix="ms"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="平均热缓存时间" 
                      value={Math.round(benchmarkResults.summary.averageWarmTime)}
                      suffix="ms"
                    />
                  </Col>
                  <Col span={8}>
                    <Statistic 
                      title="缓存效率提升" 
                      value={Math.round((1 - benchmarkResults.summary.averageWarmTime / benchmarkResults.summary.averageColdTime) * 100)}
                      suffix="%"
                    />
                  </Col>
                </Row>

                <Table
                  columns={[
                    {
                      title: '查询类型',
                      dataIndex: 'type',
                      key: 'type'
                    },
                    {
                      title: '冷启动时间',
                      dataIndex: 'cold',
                      key: 'cold',
                      render: (time: number) => `${time}ms`
                    },
                    {
                      title: '热缓存时间',
                      dataIndex: 'warm',
                      key: 'warm',
                      render: (time: number) => `${time}ms`
                    },
                    {
                      title: '性能提升',
                      key: 'improvement',
                      render: (_, record: any) => {
                        const improvement = Math.round((1 - record.warm / record.cold) * 100);
                        return (
                          <Tag color={improvement > 80 ? 'green' : improvement > 50 ? 'orange' : 'red'}>
                            {improvement}%
                          </Tag>
                        );
                      }
                    }
                  ]}
                  dataSource={Object.entries(benchmarkResults.results).map(([type, data]) => ({
                    type,
                    ...data
                  }))}
                  rowKey="type"
                  pagination={false}
                />
              </Card>
            ) : (
              <Card>
                <Alert
                  message="暂无基准测试结果"
                  description="点击性能基准测试按钮运行测试"
                  type="info"
                  showIcon
                />
              </Card>
            )}
          </Tabs.TabPane>
        </Tabs>
      </div>
    </AntdAdminLayout>
  );
}

export default function PerformanceMonitoringPage() {
  return (
    <AntdAdminGuard>
      <PerformanceMonitoring />
    </AntdAdminGuard>
  );
}