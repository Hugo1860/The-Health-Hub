'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress,
  Button,
  Space,
  Typography,
  Table,
  Tag,
  message,
  Tabs,
  Alert,
  Divider,
  Tooltip,
  Modal,
  Badge
} from 'antd';
import {
  FolderOutlined,
  SoundOutlined,
  FileImageOutlined,
  DeleteOutlined,
  ReloadOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  FolderOpenOutlined,
  CloudServerOutlined,
  PieChartOutlined,
  BarChartOutlined,
  PlayCircleOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';

const { Title, Text, Paragraph } = Typography;

interface StorageStats {
  totalSize: number;
  audioSize: number;
  coverSize: number;
  otherSize: number;
  audioCount: number;
  coverCount: number;
  otherCount: number;
  trashSize: number;
  trashCount: number;
  usagePercent?: number;
  maxSize?: number;
  availableSize?: number;
  byCategory?: Record<string, { count: number; size: number }>;
  recentUploads?: Array<{
    filename: string;
    size: number;
    uploadDate: string;
    type: string;
  }>;
}

interface OrphanFile {
  path: string;
  size: number;
  type: 'audio' | 'cover';
  mtime: string;
}

export default function ResourcesManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [orphanFiles, setOrphanFiles] = useState<OrphanFile[]>([]);
  const [cleanupLoading, setCleanupLoading] = useState(false);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (!session?.user || (session.user as any).role !== 'admin') {
      router.push('/');
      return;
    }

    fetchStorageStats();
  }, [session, status, router]);

  const fetchStorageStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/storage/stats', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data);
      } else {
        message.error('获取存储统计失败');
      }
    } catch (error) {
      console.error('获取存储统计失败:', error);
      message.error('获取存储统计失败');
    } finally {
      setLoading(false);
    }
  };

  const runOrphanCheck = async () => {
    try {
      setCleanupLoading(true);
      message.loading({ content: '正在检测孤儿文件...', key: 'orphan-check' });
      
      // 这里调用孤儿文件检测API（需要创建）
      const response = await fetch('/api/admin/storage/orphans', {
        credentials: 'include'
      });

      if (response.ok) {
        const data = await response.json();
        setOrphanFiles(data.orphans || []);
        message.success({ 
          content: `发现 ${data.orphans?.length || 0} 个孤儿文件`, 
          key: 'orphan-check' 
        });
      } else {
        message.error({ content: '孤儿文件检测失败', key: 'orphan-check' });
      }
    } catch (error) {
      console.error('孤儿文件检测失败:', error);
      message.error({ content: '孤儿文件检测失败', key: 'orphan-check' });
    } finally {
      setCleanupLoading(false);
    }
  };

  const cleanupOrphans = async () => {
    Modal.confirm({
      title: '确认清理孤儿文件',
      content: `确定要将 ${orphanFiles.length} 个孤儿文件移动到回收站吗？`,
      okText: '确定',
      cancelText: '取消',
      onOk: async () => {
        try {
          setCleanupLoading(true);
          message.loading({ content: '正在清理孤儿文件...', key: 'cleanup' });
          
          const response = await fetch('/api/admin/storage/cleanup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ orphans: orphanFiles })
          });

          if (response.ok) {
            const data = await response.json();
            message.success({ 
              content: `已移动 ${data.cleaned} 个文件到回收站`, 
              key: 'cleanup' 
            });
            setOrphanFiles([]);
            fetchStorageStats();
          } else {
            message.error({ content: '清理失败', key: 'cleanup' });
          }
        } catch (error) {
          console.error('清理失败:', error);
          message.error({ content: '清理失败', key: 'cleanup' });
        } finally {
          setCleanupLoading(false);
        }
      }
    });
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(2) + ' ' + sizes[i];
  };

  const getStorageUsagePercent = () => {
    if (!stats) return 0;
    // 优先使用 API 返回的百分比
    if (stats.usagePercent !== undefined) {
      return Math.round(stats.usagePercent);
    }
    // 备用计算方式
    const maxStorage = stats.maxSize || (50 * 1024 * 1024 * 1024); // 50GB
    return Math.round((stats.totalSize / maxStorage) * 100);
  };

  const orphanColumns = [
    {
      title: '文件路径',
      dataIndex: 'path',
      key: 'path',
      width: '50%',
      ellipsis: true,
    },
    {
      title: '类型',
      dataIndex: 'type',
      key: 'type',
      width: '15%',
      render: (type: string) => (
        <Tag color={type === 'audio' ? 'blue' : 'green'}>
          {type === 'audio' ? '音频' : '封面'}
        </Tag>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: '15%',
      render: (size: number) => formatSize(size),
    },
    {
      title: '修改时间',
      dataIndex: 'mtime',
      key: 'mtime',
      width: '20%',
      render: (mtime: string) => new Date(mtime).toLocaleString('zh-CN'),
    },
  ];

  if (status === 'loading' || loading) {
    return (
      <AntdAdminLayout>
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>加载中...</p>
        </div>
      </AntdAdminLayout>
    );
  }

  if (!session?.user || (session.user as any).role !== 'admin') {
    return null;
  }

  const storagePercent = getStorageUsagePercent();

  return (
    <AntdAdminLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 页面标题 */}
        <div>
          <Title level={2}>
            <FolderOpenOutlined /> 文件资源管理
          </Title>
          <Text type="secondary">
            管理系统存储空间，查看文件统计，清理冗余资源
          </Text>
        </div>

        {/* 存储概览 */}
        <Card 
          title={
            <Space>
              <CloudServerOutlined />
              <span>存储空间概览</span>
            </Space>
          }
          extra={
            <Button 
              icon={<ReloadOutlined />} 
              onClick={fetchStorageStats}
              loading={loading}
            >
              刷新
            </Button>
          }
        >
          <Row gutter={16}>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="总存储占用"
                  value={formatSize(stats?.totalSize || 0)}
                  prefix={<CloudServerOutlined />}
                  valueStyle={{ color: '#1890ff' }}
                />
                <Progress 
                  percent={storagePercent} 
                  status={storagePercent > 80 ? 'exception' : 'active'}
                  size="small"
                  style={{ marginTop: 8 }}
                />
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="音频文件"
                  value={stats?.audioCount || 0}
                  suffix="个"
                  prefix={<SoundOutlined />}
                  valueStyle={{ color: '#52c41a' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  占用 {formatSize(stats?.audioSize || 0)}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="封面图片"
                  value={stats?.coverCount || 0}
                  suffix="个"
                  prefix={<FileImageOutlined />}
                  valueStyle={{ color: '#faad14' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  占用 {formatSize(stats?.coverSize || 0)}
                </Text>
              </Card>
            </Col>
            <Col xs={24} sm={12} lg={6}>
              <Card>
                <Statistic
                  title="回收站"
                  value={stats?.trashCount || 0}
                  suffix="个"
                  prefix={<DeleteOutlined />}
                  valueStyle={{ color: stats?.trashCount ? '#ff4d4f' : '#d9d9d9' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  占用 {formatSize(stats?.trashSize || 0)}
                </Text>
              </Card>
            </Col>
          </Row>

          {storagePercent > 80 && (
            <Alert
              message="存储空间警告"
              description={`当前存储使用率已达 ${storagePercent}%，建议及时清理冗余文件。`}
              type="warning"
              showIcon
              icon={<WarningOutlined />}
              style={{ marginTop: 16 }}
            />
          )}
        </Card>

        {/* 文件管理选项卡 */}
        <Card>
          <Tabs 
            defaultActiveKey="1"
            items={[
              {
                key: '1',
                label: (
                  <span>
                    <DeleteOutlined />
                    孤儿文件清理
                    {orphanFiles.length > 0 && (
                      <Badge 
                        count={orphanFiles.length} 
                        style={{ marginLeft: 8 }}
                      />
                    )}
                  </span>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Alert
                      message="什么是孤儿文件？"
                      description="孤儿文件是指存在于文件系统中，但数据库中没有对应记录的文件。这些文件通常是由于上传失败、删除不完整等原因产生的。"
                      type="info"
                      showIcon
                      icon={<WarningOutlined />}
                    />

                    <Space>
                      <Button 
                        type="primary"
                        icon={<ReloadOutlined />}
                        onClick={runOrphanCheck}
                        loading={cleanupLoading}
                      >
                        检测孤儿文件
                      </Button>
                      
                      {orphanFiles.length > 0 && (
                        <Button 
                          danger
                          icon={<DeleteOutlined />}
                          onClick={cleanupOrphans}
                          loading={cleanupLoading}
                        >
                          清理到回收站 ({orphanFiles.length})
                        </Button>
                      )}
                    </Space>

                    {orphanFiles.length > 0 && (
                      <>
                        <Divider />
                        <Alert
                          message={`发现 ${orphanFiles.length} 个孤儿文件`}
                          description={`总大小: ${formatSize(orphanFiles.reduce((sum, f) => sum + f.size, 0))}`}
                          type="warning"
                          showIcon
                        />
                        <Table
                          columns={orphanColumns}
                          dataSource={orphanFiles}
                          rowKey="path"
                          pagination={{
                            pageSize: 10,
                            showTotal: (total) => `共 ${total} 个文件`,
                          }}
                          scroll={{ x: 800 }}
                        />
                      </>
                    )}
                  </Space>
                ),
              },
              {
                key: '2',
                label: (
                  <span>
                    <PieChartOutlined />
                    存储分析
                  </span>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Title level={4}>按类型分布</Title>
                    <Row gutter={16}>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="音频文件占比"
                            value={stats ? Math.round((stats.audioSize / stats.totalSize) * 100) : 0}
                            suffix="%"
                            prefix={<SoundOutlined />}
                          />
                          <Progress 
                            percent={stats ? Math.round((stats.audioSize / stats.totalSize) * 100) : 0}
                            strokeColor="#1890ff"
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="封面图片占比"
                            value={stats ? Math.round((stats.coverSize / stats.totalSize) * 100) : 0}
                            suffix="%"
                            prefix={<FileImageOutlined />}
                          />
                          <Progress 
                            percent={stats ? Math.round((stats.coverSize / stats.totalSize) * 100) : 0}
                            strokeColor="#52c41a"
                          />
                        </Card>
                      </Col>
                      <Col span={8}>
                        <Card>
                          <Statistic
                            title="其他文件占比"
                            value={stats ? Math.round((stats.otherSize / stats.totalSize) * 100) : 0}
                            suffix="%"
                            prefix={<FolderOutlined />}
                          />
                          <Progress 
                            percent={stats ? Math.round((stats.otherSize / stats.totalSize) * 100) : 0}
                            strokeColor="#faad14"
                          />
                        </Card>
                      </Col>
                    </Row>

                    <Divider />

                    <Title level={4}>按分类分布</Title>
                    {stats?.byCategory && Object.keys(stats.byCategory).length > 0 ? (
                      <Row gutter={[16, 16]}>
                        {Object.entries(stats.byCategory).map(([category, data]) => (
                          <Col key={category} xs={24} sm={12} lg={8}>
                            <Card size="small">
                              <Statistic
                                title={category}
                                value={data.count}
                                suffix="个"
                                prefix={<PlayCircleOutlined />}
                              />
                              <Text type="secondary" style={{ fontSize: 12 }}>
                                占用 {formatSize(data.size)}
                              </Text>
                            </Card>
                          </Col>
                        ))}
                      </Row>
                    ) : (
                      <Alert message="暂无分类数据" type="info" />
                    )}
                  </Space>
                ),
              },
              {
                key: '3',
                label: (
                  <span>
                    <BarChartOutlined />
                    维护工具
                  </span>
                ),
                children: (
                  <Space direction="vertical" style={{ width: '100%' }} size="middle">
                    <Card title="文件整理工具" size="small">
                      <Paragraph>
                        <Text type="secondary">
                          将上传目录中的文件按照年/月组织到规范的目录结构中。
                        </Text>
                      </Paragraph>
                      <Paragraph>
                        <Text code>node scripts/organize-files.js --verbose</Text>
                      </Paragraph>
                      <Button type="primary" disabled>
                        运行整理脚本（开发中）
                      </Button>
                    </Card>

                    <Card title="清空回收站" size="small">
                      <Paragraph>
                        <Text type="secondary">
                          清空回收站中的所有文件。建议在确认文件无需恢复后再执行此操作。
                        </Text>
                      </Paragraph>
                      <Alert
                        message="警告"
                        description="此操作不可逆，请谨慎操作！"
                        type="warning"
                        showIcon
                        style={{ marginBottom: 16 }}
                      />
                      <Button danger disabled>
                        清空回收站（开发中）
                      </Button>
                    </Card>

                    <Card title="数据库同步检查" size="small">
                      <Paragraph>
                        <Text type="secondary">
                          检查数据库记录与文件系统是否一致，修复不匹配的记录。
                        </Text>
                      </Paragraph>
                      <Button type="primary" disabled>
                        运行同步检查（开发中）
                      </Button>
                    </Card>
                  </Space>
                ),
              },
            ]}
          />
        </Card>

        {/* 快速操作指南 */}
        <Card 
          title="📚 维护指南"
          size="small"
        >
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>每周任务：</Text>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>检测并清理孤儿文件</li>
              <li>查看存储使用趋势</li>
            </ul>
            
            <Text strong>每月任务：</Text>
            <ul style={{ paddingLeft: 20, margin: 0 }}>
              <li>清空回收站（30天前的文件）</li>
              <li>审查存储统计报告</li>
              <li>执行数据备份</li>
            </ul>

            <Divider style={{ margin: '12px 0' }} />

            <Text type="secondary" style={{ fontSize: 12 }}>
              💡 提示: 可以通过命令行运行维护脚本获得更多控制选项。
              详见 <Text code>RESOURCE_MANAGEMENT_QUICK_START.md</Text>
            </Text>
          </Space>
        </Card>
      </Space>
    </AntdAdminLayout>
  );
}
