'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Row,
  Col,
  Statistic,
  Progress,
  Button,
  Space,
  Table,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Alert,
  Descriptions,
  Typography,
  Divider,
  App
} from 'antd';
import {
  DatabaseOutlined,
  CloudServerOutlined,
  SafetyOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  ReloadOutlined,
  DownloadOutlined,
  DeleteOutlined,
  EyeOutlined,
  ClockCircleOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { useAntdPermissionCheck, ANTD_ADMIN_PERMISSIONS } from '@/hooks/useAntdAdminAuth';
import { AntdAdminGuard } from '@/components/AntdAdminGuard';

const { Title, Text } = Typography;
const { Option } = Select;

interface SystemStatus {
  uptime: number;
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
  };
  diskSpace: {
    total: number;
    used: number;
    free: number;
  };
  systemHealth: 'healthy' | 'warning' | 'critical';
  lastBackup?: string;
  errorCount: number;
  activeUsers: number;
}

interface BackupInfo {
  id: string;
  timestamp: string;
  type: 'full' | 'data';
  size: number;
  status: 'completed' | 'failed' | 'in_progress';
  description?: string;
}

function AntdSystemSettingsManagement() {
  const { hasPermission } = useAntdPermissionCheck();
  const { modal } = App.useApp();
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [backupLoading, setBackupLoading] = useState(false);
  const [createBackupModalVisible, setCreateBackupModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 模拟数据加载
  useEffect(() => {
    loadSystemStatus();
    loadBackups();
  }, []);

  const loadSystemStatus = () => {
    setTimeout(() => {
      setSystemStatus({
        uptime: 86400 * 7 + 3600 * 12, // 7天12小时
        memoryUsage: {
          heapUsed: 134217728, // 128MB
          heapTotal: 268435456, // 256MB
        },
        diskSpace: {
          total: 107374182400, // 100GB
          used: 32212254720,   // 30GB
          free: 75161927680,   // 70GB
        },
        systemHealth: 'healthy',
        lastBackup: '2024-01-15T10:30:00Z',
        errorCount: 3,
        activeUsers: 45
      });
      setLoading(false);
    }, 1000);
  };

  const loadBackups = () => {
    setTimeout(() => {
      setBackups([
        {
          id: '1',
          timestamp: '2024-01-15T10:30:00Z',
          type: 'full',
          size: 524288000, // 500MB
          status: 'completed',
          description: '定期完整备份'
        },
        {
          id: '2',
          timestamp: '2024-01-14T10:30:00Z',
          type: 'data',
          size: 104857600, // 100MB
          status: 'completed',
          description: '数据备份'
        },
        {
          id: '3',
          timestamp: '2024-01-13T10:30:00Z',
          type: 'full',
          size: 520093696, // 496MB
          status: 'failed',
          description: '自动备份失败'
        }
      ]);
    }, 1200);
  };

  // 格式化文件大小
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  // 格式化运行时间
  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (days > 0) {
      return `${days}天 ${hours}小时 ${minutes}分钟`;
    } else if (hours > 0) {
      return `${hours}小时 ${minutes}分钟`;
    } else {
      return `${minutes}分钟`;
    }
  };

  // 获取健康状态配置
  const getHealthConfig = (health: string) => {
    switch (health) {
      case 'healthy':
        return { color: 'success', icon: <CheckCircleOutlined />, text: '健康' };
      case 'warning':
        return { color: 'warning', icon: <WarningOutlined />, text: '警告' };
      case 'critical':
        return { color: 'error', icon: <ExclamationCircleOutlined />, text: '严重' };
      default:
        return { color: 'default', icon: <ExclamationCircleOutlined />, text: '未知' };
    }
  };

  // 创建备份
  const handleCreateBackup = async () => {
    try {
      const values = await form.validateFields();
      setBackupLoading(true);
      
      // 模拟备份创建
      setTimeout(() => {
        const newBackup: BackupInfo = {
          id: Date.now().toString(),
          timestamp: new Date().toISOString(),
          type: values.type,
          size: values.type === 'full' ? 520000000 : 100000000,
          status: 'completed',
          description: values.description || `${values.type === 'full' ? '完整' : '数据'}备份`
        };
        
        setBackups([newBackup, ...backups]);
        setCreateBackupModalVisible(false);
        setBackupLoading(false);
        form.resetFields();
        message.success('备份创建成功');
      }, 3000);
    } catch (error) {
      console.error('创建备份失败:', error);
      setBackupLoading(false);
    }
  };

  // 删除备份
  const handleDeleteBackup = (backupId: string) => {
    modal.confirm({
      title: '确认删除',
      content: '确定要删除这个备份吗？此操作不可恢复。',
      okText: '确定',
      cancelText: '取消',
      onOk: () => {
        setBackups(backups.filter(backup => backup.id !== backupId));
        message.success('备份删除成功');
      }
    });
  };

  // 备份表格列
  const backupColumns = [
    {
      title: '备份时间',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: string) => new Date(timestamp).toLocaleString('zh-CN'),
      sorter: (a: BackupInfo, b: BackupInfo) => 
        new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime(),
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'full' ? 'blue' : 'green'}>
          {type === 'full' ? '完整备份' : '数据备份'}
        </Tag>
      ),
      filters: [
        { text: '完整备份', value: 'full' },
        { text: '数据备份', value: 'data' },
      ],
      onFilter: (value: any, record: BackupInfo) => record.type === value,
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      render: (size: number) => formatBytes(size),
      sorter: (a: BackupInfo, b: BackupInfo) => a.size - b.size,
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const statusConfig = {
          completed: { color: 'success', text: '完成' },
          failed: { color: 'error', text: '失败' },
          in_progress: { color: 'processing', text: '进行中' },
        };
        const config = statusConfig[status as keyof typeof statusConfig];
        return <Tag color={config.color}>{config.text}</Tag>;
      },
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_: any, record: BackupInfo) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            disabled={record.status !== 'completed'}
          >
            下载
          </Button>
          <Button
            type="link"
            danger
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteBackup(record.id)}
            disabled={!hasPermission(ANTD_ADMIN_PERMISSIONS.BACKUP_DATA)}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  if (!hasPermission(ANTD_ADMIN_PERMISSIONS.SYSTEM_SETTINGS)) {
    return (
      <AntdAdminLayout>
        <Card>
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <ExclamationCircleOutlined style={{ fontSize: '48px', color: '#faad14' }} />
            <Title level={3}>权限不足</Title>
            <Text>您没有权限访问系统设置功能。</Text>
          </div>
        </Card>
      </AntdAdminLayout>
    );
  }

  const healthConfig = systemStatus ? getHealthConfig(systemStatus.systemHealth) : null;

  return (
    <AntdAdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 系统状态概览 */}
        <Card 
          title={
            <Space>
              <CloudServerOutlined />
              系统状态概览
            </Space>
          }
          extra={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={loadSystemStatus}
              loading={loading}
            >
              刷新
            </Button>
          }
          loading={loading}
        >
          {systemStatus && (
            <>
              <Row gutter={16} style={{ marginBottom: 24 }}>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title="系统健康"
                      value={healthConfig?.text}
                      prefix={healthConfig?.icon}
                      valueStyle={{ 
                        color: healthConfig?.color === 'success' ? '#52c41a' : 
                               healthConfig?.color === 'warning' ? '#faad14' : '#f5222d' 
                      }}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title="运行时间"
                      value={formatUptime(systemStatus.uptime)}
                      prefix={<ClockCircleOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title="活跃用户"
                      value={systemStatus.activeUsers}
                      prefix={<EyeOutlined />}
                    />
                  </Card>
                </Col>
                <Col span={6}>
                  <Card size="small">
                    <Statistic
                      title="错误数量"
                      value={systemStatus.errorCount}
                      prefix={<WarningOutlined />}
                      valueStyle={{ color: systemStatus.errorCount > 10 ? '#f5222d' : '#52c41a' }}
                    />
                  </Card>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col span={12}>
                  <Card title="内存使用情况" size="small">
                    <Progress
                      percent={Math.round((systemStatus.memoryUsage.heapUsed / systemStatus.memoryUsage.heapTotal) * 100)}
                      status={
                        (systemStatus.memoryUsage.heapUsed / systemStatus.memoryUsage.heapTotal) > 0.8 ? 'exception' :
                        (systemStatus.memoryUsage.heapUsed / systemStatus.memoryUsage.heapTotal) > 0.6 ? 'active' : 'success'
                      }
                      format={() => 
                        `${formatBytes(systemStatus.memoryUsage.heapUsed)} / ${formatBytes(systemStatus.memoryUsage.heapTotal)}`
                      }
                    />
                  </Card>
                </Col>
                <Col span={12}>
                  <Card title="磁盘使用情况" size="small">
                    <Progress
                      percent={Math.round((systemStatus.diskSpace.used / systemStatus.diskSpace.total) * 100)}
                      status={
                        (systemStatus.diskSpace.used / systemStatus.diskSpace.total) > 0.8 ? 'exception' :
                        (systemStatus.diskSpace.used / systemStatus.diskSpace.total) > 0.6 ? 'active' : 'success'
                      }
                      format={() => 
                        `${formatBytes(systemStatus.diskSpace.used)} / ${formatBytes(systemStatus.diskSpace.total)}`
                      }
                    />
                  </Card>
                </Col>
              </Row>

              {systemStatus.lastBackup && (
                <Alert
                  message="最后备份时间"
                  description={`系统最后一次备份时间：${new Date(systemStatus.lastBackup).toLocaleString('zh-CN')}`}
                  type="info"
                  showIcon
                  style={{ marginTop: 16 }}
                />
              )}
            </>
          )}
        </Card>

        {/* 备份管理 */}
        <Card
          title={
            <Space>
              <DatabaseOutlined />
              备份管理
            </Space>
          }
          extra={
            <Button
              type="primary"
              icon={<DatabaseOutlined />}
              onClick={() => setCreateBackupModalVisible(true)}
              disabled={!hasPermission(ANTD_ADMIN_PERMISSIONS.BACKUP_DATA)}
            >
              创建备份
            </Button>
          }
        >
          <Table
            columns={backupColumns}
            dataSource={backups}
            rowKey="id"
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => 
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`,
            }}
          />
        </Card>

        {/* 系统信息 */}
        <Card
          title={
            <Space>
              <SafetyOutlined />
              系统信息
            </Space>
          }
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label="操作系统">Linux Ubuntu 20.04</Descriptions.Item>
            <Descriptions.Item label="Node.js 版本">v18.17.0</Descriptions.Item>
            <Descriptions.Item label="Next.js 版本">15.4.3</Descriptions.Item>
            <Descriptions.Item label="数据库">JSON 文件存储</Descriptions.Item>
            <Descriptions.Item label="服务器时间">
              {new Date().toLocaleString('zh-CN')}
            </Descriptions.Item>
            <Descriptions.Item label="时区">Asia/Shanghai (UTC+8)</Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 创建备份模态框 */}
        <Modal
          title="创建系统备份"
          open={createBackupModalVisible}
          onOk={handleCreateBackup}
          onCancel={() => {
            setCreateBackupModalVisible(false);
            form.resetFields();
          }}
          okText="创建备份"
          cancelText="取消"
          confirmLoading={backupLoading}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{ type: 'data' }}
          >
            <Form.Item
              name="type"
              label="备份类型"
              rules={[{ required: true, message: '请选择备份类型' }]}
            >
              <Select>
                <Option value="data">数据备份（仅备份数据文件）</Option>
                <Option value="full">完整备份（包含所有文件）</Option>
              </Select>
            </Form.Item>
            
            <Form.Item
              name="description"
              label="备份描述"
              help="可选，用于标识此次备份的目的"
            >
              <Input.TextArea 
                rows={3} 
                placeholder="请输入备份描述，例如：升级前备份、定期备份等"
              />
            </Form.Item>
          </Form>
          
          <Alert
            message="备份说明"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>数据备份：仅备份用户数据和配置文件，速度较快</li>
                <li>完整备份：备份整个系统，包括程序文件，耗时较长</li>
                <li>备份过程中系统仍可正常使用</li>
                <li>建议定期创建备份以确保数据安全</li>
              </ul>
            }
            type="info"
            showIcon
            style={{ marginTop: 16 }}
          />
        </Modal>
      </Space>
    </AntdAdminLayout>
  );
}

export default function AntdSystemSettings() {
  return (
    <AntdAdminGuard requiredPermission={ANTD_ADMIN_PERMISSIONS.SYSTEM_SETTINGS}>
      <AntdSystemSettingsManagement />
    </AntdAdminGuard>
  );
}