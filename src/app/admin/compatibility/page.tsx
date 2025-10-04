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
  App
} from 'antd';
import {
  SyncOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ClearOutlined,
  FileTextOutlined,
  ReloadOutlined,
  WarningOutlined,
  InfoCircleOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { AntdAdminGuard } from '../../../components/AntdAdminGuard';

const { Title, Text, Paragraph } = Typography;
const { TabPane } = Tabs;

interface ConsistencyReport {
  totalAudios: number;
  consistent: number;
  inconsistent: number;
  missingCategories: number;
  orphanedReferences: number;
  issues: Array<{
    audioId: string;
    title: string;
    issues: string[];
    suggestions: string[];
  }>;
}

interface SyncResult {
  success: boolean;
  processed: number;
  updated: number;
  errors: number;
  details: Array<{
    audioId: string;
    action: 'updated' | 'skipped' | 'error';
    message?: string;
  }>;
}

interface FullReport {
  timestamp: string;
  consistencyReport: ConsistencyReport;
  recommendations: string[];
}

function CompatibilityManagement() {
  const { modal } = App.useApp();
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<FullReport | null>(null);
  const [syncResult, setSyncResult] = useState<SyncResult | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadReport();
  }, []);

  const loadReport = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/compatibility?action=report');
      const data = await response.json();
      
      if (data.success) {
        setReport(data.data);
      } else {
        message.error(data.error || '获取报告失败');
      }
    } catch (error) {
      console.error('获取兼容性报告失败:', error);
      message.error('获取报告失败');
    } finally {
      setLoading(false);
    }
  };

  const executeAction = async (action: string, options: any = {}) => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/compatibility', {
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
        
        if (action === 'sync' || action === 'fix') {
          setSyncResult(data.data);
        }
        
        // 重新加载报告
        await loadReport();
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

  const handleSync = () => {
    modal.confirm({
      title: '确认同步数据',
      content: '此操作将同步所有音频的分类字段，可能需要较长时间。确定要继续吗？',
      onOk: () => executeAction('sync'),
    });
  };

  const handleFix = () => {
    modal.confirm({
      title: '确认修复数据',
      content: '此操作将修复所有数据不一致问题。确定要继续吗？',
      onOk: () => executeAction('fix'),
    });
  };

  const handleCleanup = () => {
    modal.confirm({
      title: '确认清理数据',
      content: '此操作将清理所有孤立的分类引用，无法撤销。确定要继续吗？',
      okType: 'danger',
      onOk: () => executeAction('cleanup'),
    });
  };

  const getConsistencyColor = (report: ConsistencyReport) => {
    const rate = report.consistent / report.totalAudios;
    if (rate >= 0.95) return 'success';
    if (rate >= 0.8) return 'warning';
    return 'exception';
  };

  const getConsistencyPercent = (report: ConsistencyReport) => {
    return Math.round((report.consistent / report.totalAudios) * 100);
  };

  const issueColumns = [
    {
      title: '音频ID',
      dataIndex: 'audioId',
      key: 'audioId',
      width: 120,
    },
    {
      title: '标题',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
    },
    {
      title: '问题',
      dataIndex: 'issues',
      key: 'issues',
      render: (issues: string[]) => (
        <Space direction="vertical" size="small">
          {issues.map((issue, index) => (
            <Tag key={index} color="red" style={{ fontSize: 11 }}>
              {issue}
            </Tag>
          ))}
        </Space>
      ),
    },
    {
      title: '建议',
      dataIndex: 'suggestions',
      key: 'suggestions',
      render: (suggestions: string[]) => (
        <Space direction="vertical" size="small">
          {suggestions.map((suggestion, index) => (
            <Tag key={index} color="blue" style={{ fontSize: 11 }}>
              {suggestion}
            </Tag>
          ))}
        </Space>
      ),
    },
  ];

  const syncDetailColumns = [
    {
      title: '音频ID',
      dataIndex: 'audioId',
      key: 'audioId',
      width: 120,
    },
    {
      title: '操作',
      dataIndex: 'action',
      key: 'action',
      render: (action: string) => {
        const config = {
          updated: { color: 'green', text: '已更新' },
          skipped: { color: 'default', text: '已跳过' },
          error: { color: 'red', text: '错误' },
        };
        const { color, text } = config[action as keyof typeof config] || config.error;
        return <Tag color={color}>{text}</Tag>;
      },
    },
    {
      title: '消息',
      dataIndex: 'message',
      key: 'message',
      ellipsis: true,
    },
  ];

  if (loading && !report) {
    return (
      <AntdAdminLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" tip="加载兼容性报告..." />
        </div>
      </AntdAdminLayout>
    );
  }

  return (
    <AntdAdminLayout>
      <div style={{ padding: '24px' }}>
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Title level={2} style={{ margin: 0 }}>
            分类兼容性管理
          </Title>
          <Space>
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadReport}
              loading={loading}
            >
              刷新报告
            </Button>
          </Space>
        </div>

        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <Tabs.TabPane tab="概览" key="overview">
            {report && (
              <>
                {/* 统计卡片 */}
                <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="总音频数"
                        value={report.consistencyReport.totalAudios}
                        prefix={<FileTextOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="数据一致"
                        value={report.consistencyReport.consistent}
                        prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        suffix={`/ ${report.consistencyReport.totalAudios}`}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="数据不一致"
                        value={report.consistencyReport.inconsistent}
                        prefix={<ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />}
                        valueStyle={{ color: report.consistencyReport.inconsistent > 0 ? '#ff4d4f' : undefined }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} md={6}>
                    <Card>
                      <Statistic
                        title="孤立引用"
                        value={report.consistencyReport.orphanedReferences}
                        prefix={<WarningOutlined style={{ color: '#faad14' }} />}
                        valueStyle={{ color: report.consistencyReport.orphanedReferences > 0 ? '#faad14' : undefined }}
                      />
                    </Card>
                  </Col>
                </Row>

                {/* 一致性进度 */}
                <Card title="数据一致性" style={{ marginBottom: 24 }}>
                  <Progress
                    percent={getConsistencyPercent(report.consistencyReport)}
                    status={getConsistencyColor(report.consistencyReport)}
                    strokeWidth={10}
                    format={(percent) => `${percent}% 一致`}
                  />
                  <div style={{ marginTop: 16 }}>
                    <Text type="secondary">
                      {report.consistencyReport.consistent} / {report.consistencyReport.totalAudios} 个音频数据一致
                    </Text>
                  </div>
                </Card>

                {/* 建议操作 */}
                <Card title="建议操作" style={{ marginBottom: 24 }}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    {report.recommendations.map((recommendation, index) => (
                      <Alert
                        key={index}
                        message={recommendation}
                        type={recommendation.includes('良好') ? 'success' : 'info'}
                        showIcon
                      />
                    ))}
                  </Space>

                  <div style={{ marginTop: 16 }}>
                    <Space wrap>
                      <Button
                        type="primary"
                        icon={<SyncOutlined />}
                        onClick={handleSync}
                        loading={loading}
                        disabled={report.consistencyReport.inconsistent === 0}
                      >
                        同步数据字段
                      </Button>
                      <Button
                        icon={<CheckCircleOutlined />}
                        onClick={handleFix}
                        loading={loading}
                        disabled={report.consistencyReport.inconsistent === 0}
                      >
                        修复不一致
                      </Button>
                      <Button
                        icon={<ClearOutlined />}
                        onClick={handleCleanup}
                        loading={loading}
                        disabled={report.consistencyReport.orphanedReferences === 0}
                        danger
                      >
                        清理孤立引用
                      </Button>
                    </Space>
                  </div>
                </Card>

                {/* 报告时间 */}
                <Card size="small">
                  <Text type="secondary">
                    报告生成时间: {new Date(report.timestamp).toLocaleString('zh-CN')}
                  </Text>
                </Card>
              </>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane 
            tab={
              <Badge count={report?.consistencyReport.inconsistent || 0} size="small">
                <span>数据问题</span>
              </Badge>
            } 
            key="issues"
          >
            {report && report.consistencyReport.issues.length > 0 ? (
              <Card title={`数据不一致问题 (${report.consistencyReport.issues.length})`}>
                <Table
                  columns={issueColumns}
                  dataSource={report.consistencyReport.issues}
                  rowKey="audioId"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                    showQuickJumper: true,
                  }}
                  scroll={{ x: 800 }}
                />
              </Card>
            ) : (
              <Card>
                <Alert
                  message="数据一致性良好"
                  description="未发现数据不一致问题"
                  type="success"
                  showIcon
                />
              </Card>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab="同步结果" key="sync">
            {syncResult ? (
              <Card title="最近同步结果">
                <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
                  <Col span={6}>
                    <Statistic title="处理数量" value={syncResult.processed} />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="更新数量" 
                      value={syncResult.updated}
                      valueStyle={{ color: '#52c41a' }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="错误数量" 
                      value={syncResult.errors}
                      valueStyle={{ color: syncResult.errors > 0 ? '#ff4d4f' : undefined }}
                    />
                  </Col>
                  <Col span={6}>
                    <Statistic 
                      title="成功率" 
                      value={Math.round(((syncResult.processed - syncResult.errors) / syncResult.processed) * 100)}
                      suffix="%"
                    />
                  </Col>
                </Row>

                <Table
                  columns={syncDetailColumns}
                  dataSource={syncResult.details}
                  rowKey="audioId"
                  pagination={{
                    pageSize: 10,
                    showSizeChanger: true,
                  }}
                />
              </Card>
            ) : (
              <Card>
                <Alert
                  message="暂无同步结果"
                  description="执行数据同步操作后，结果将显示在这里"
                  type="info"
                  showIcon
                />
              </Card>
            )}
          </Tabs.TabPane>

          <Tabs.TabPane tab="帮助" key="help">
            <Card title="兼容性管理说明">
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <div>
                  <Title level={4}>功能说明</Title>
                  <Paragraph>
                    分类兼容性管理工具用于维护新旧分类系统之间的数据一致性，确保系统升级后的平滑过渡。
                  </Paragraph>
                </div>

                <div>
                  <Title level={4}>主要功能</Title>
                  <List
                    dataSource={[
                      {
                        title: '数据同步',
                        description: '自动同步音频的新旧分类字段，确保数据一致性'
                      },
                      {
                        title: '一致性检查',
                        description: '检查数据库中的分类数据是否存在不一致问题'
                      },
                      {
                        title: '问题修复',
                        description: '自动修复发现的数据不一致问题'
                      },
                      {
                        title: '清理孤立引用',
                        description: '清理指向不存在分类的无效引用'
                      }
                    ]}
                    renderItem={item => (
                      <List.Item>
                        <List.Item.Meta
                          avatar={<InfoCircleOutlined style={{ color: '#1890ff' }} />}
                          title={item.title}
                          description={item.description}
                        />
                      </List.Item>
                    )}
                  />
                </div>

                <div>
                  <Title level={4}>使用建议</Title>
                  <List
                    dataSource={[
                      '定期运行一致性检查，确保数据质量',
                      '在系统升级后立即执行数据同步',
                      '谨慎使用清理功能，建议先备份数据',
                      '关注同步结果中的错误信息，及时处理异常'
                    ]}
                    renderItem={item => (
                      <List.Item>
                        <Text>• {item}</Text>
                      </List.Item>
                    )}
                  />
                </div>
              </Space>
            </Card>
          </Tabs.TabPane>
        </Tabs>
      </div>
    </AntdAdminLayout>
  );
}

export default function CompatibilityManagementPage() {
  return (
    <AntdAdminGuard>
      <CompatibilityManagement />
    </AntdAdminGuard>
  );
}