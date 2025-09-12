'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  Table,
  Button,
  Space,
  Tag,
  Modal,
  Input,
  message,
  Typography,
  Row,
  Col,
  Select,
  Pagination,
  Tooltip
} from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined
} from '@ant-design/icons';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { withAdminAuth } from '../../../hooks/useAdminAuth';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  status: 'pending' | 'approved' | 'rejected';
  moderatedAt?: string;
  moderatedBy?: string;
  moderationReason?: string;
  userId: string;
  username: string;
  email: string;
  audioTitle: string;
  audioId: string;
}

interface CommentListResponse {
  comments: Comment[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

function CommentModerationPage() {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedComments, setSelectedComments] = useState<string[]>([]);
  const [moderationModal, setModerationModal] = useState(false);
  const [currentComment, setCurrentComment] = useState<Comment | null>(null);
  const [moderationReason, setModerationReason] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    total: 0
  });
  const [filters, setFilters] = useState({
    status: 'pending',
    audioId: ''
  });

  useEffect(() => {
    fetchComments();
  }, [pagination.page, pagination.pageSize, filters]);

  const fetchComments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
        status: filters.status
      });
      
      if (filters.audioId) {
        params.append('audioId', filters.audioId);
      }

      const response = await fetch(`/api/admin/comments?${params}`);
      const data = await response.json();
      
      if (data.success) {
        setComments(data.data.comments);
        setPagination(prev => ({
          ...prev,
          total: data.data.pagination.total
        }));
      } else {
        message.error(data.error?.message || '获取评论列表失败');
      }
    } catch (error) {
      message.error('获取评论列表失败');
    } finally {
      setLoading(false);
    }
  };

  const handleModerateComment = async (commentId: string, action: 'approve' | 'reject') => {
    try {
      const response = await fetch('/api/admin/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentId,
          action,
          reason: moderationReason
        })
      });

      const data = await response.json();
      if (data.success) {
        message.success(data.message);
        setModerationModal(false);
        setModerationReason('');
        fetchComments();
      } else {
        message.error(data.error?.message || '审核失败');
      }
    } catch (error) {
      message.error('审核失败');
    }
  };

  const handleBatchModerate = async (action: 'approve' | 'reject') => {
    if (selectedComments.length === 0) {
      message.warning('请选择要审核的评论');
      return;
    }

    try {
      const response = await fetch('/api/admin/comments', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commentIds: selectedComments,
          action,
          reason: moderationReason
        })
      });

      const data = await response.json();
      if (data.success) {
        message.success(data.message);
        setSelectedComments([]);
        setModerationReason('');
        fetchComments();
      } else {
        message.error(data.error?.message || '批量审核失败');
      }
    } catch (error) {
      message.error('批量审核失败');
    }
  };

  const openModerationModal = (comment: Comment) => {
    setCurrentComment(comment);
    setModerationModal(true);
  };

  const columns = [
    {
      title: '评论内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
      render: (text: string, record: Comment) => (
        <div>
          <Text ellipsis={{ tooltip: text }} style={{ maxWidth: 300 }}>
            {text}
          </Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            音频: {record.audioTitle}
          </Text>
        </div>
      )
    },
    {
      title: '用户',
      dataIndex: 'username',
      key: 'username',
      width: 120,
      render: (username: string, record: Comment) => (
        <div>
          <Text strong>{username}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.email}
          </Text>
        </div>
      )
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (status: string) => {
        const statusMap = {
          pending: { color: 'orange', text: '待审核' },
          approved: { color: 'green', text: '已通过' },
          rejected: { color: 'red', text: '已拒绝' }
        };
        const config = statusMap[status as keyof typeof statusMap];
        return <Tag color={config.color}>{config.text}</Tag>;
      }
    },
    {
      title: '提交时间',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (date: string) => new Date(date).toLocaleString('zh-CN')
    },
    {
      title: '操作',
      key: 'actions',
      width: 150,
      render: (_, record: Comment) => (
        <Space>
          <Tooltip title="查看详情">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => openModerationModal(record)}
            />
          </Tooltip>
          {record.status === 'pending' && (
            <>
              <Tooltip title="通过">
                <Button
                  type="text"
                  icon={<CheckOutlined />}
                  style={{ color: '#52c41a' }}
                  onClick={() => handleModerateComment(record.id, 'approve')}
                />
              </Tooltip>
              <Tooltip title="拒绝">
                <Button
                  type="text"
                  icon={<CloseOutlined />}
                  style={{ color: '#ff4d4f' }}
                  onClick={() => openModerationModal(record)}
                />
              </Tooltip>
            </>
          )}
        </Space>
      )
    }
  ];

  const rowSelection = {
    selectedRowKeys: selectedComments,
    onChange: (selectedRowKeys: React.Key[]) => {
      setSelectedComments(selectedRowKeys as string[]);
    },
    getCheckboxProps: (record: Comment) => ({
      disabled: record.status !== 'pending'
    })
  };

  return (
    <AntdAdminLayout>
      <div style={{ padding: '24px' }}>
        <Card>
          <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
            <Col>
              <Title level={3} style={{ margin: 0 }}>
                评论审核管理
              </Title>
            </Col>
            <Col>
              <Space>
                <Select
                  value={filters.status}
                  onChange={(value) => setFilters(prev => ({ ...prev, status: value }))}
                  style={{ width: 120 }}
                >
                  <Option value="pending">待审核</Option>
                  <Option value="approved">已通过</Option>
                  <Option value="rejected">已拒绝</Option>
                  <Option value="">全部</Option>
                </Select>
                <Input
                  placeholder="音频ID"
                  value={filters.audioId}
                  onChange={(e) => setFilters(prev => ({ ...prev, audioId: e.target.value }))}
                  style={{ width: 200 }}
                />
                <Button icon={<SearchOutlined />} onClick={fetchComments}>
                  搜索
                </Button>
              </Space>
            </Col>
          </Row>

          {selectedComments.length > 0 && (
            <div style={{ marginBottom: 16, padding: 12, backgroundColor: '#f0f0f0', borderRadius: 6 }}>
              <Space>
                <Text>已选择 {selectedComments.length} 条评论</Text>
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => handleBatchModerate('approve')}
                >
                  批量通过
                </Button>
                <Button
                  danger
                  icon={<CloseOutlined />}
                  onClick={() => handleBatchModerate('reject')}
                >
                  批量拒绝
                </Button>
                <TextArea
                  placeholder="审核原因（可选）"
                  value={moderationReason}
                  onChange={(e) => setModerationReason(e.target.value)}
                  rows={2}
                  style={{ width: 300 }}
                />
              </Space>
            </div>
          )}

          <Table
            rowSelection={rowSelection}
            columns={columns}
            dataSource={comments}
            loading={loading}
            rowKey="id"
            pagination={false}
            scroll={{ x: 800 }}
          />

          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Pagination
              current={pagination.page}
              pageSize={pagination.pageSize}
              total={pagination.total}
              onChange={(page, pageSize) => {
                setPagination(prev => ({
                  ...prev,
                  page,
                  pageSize: pageSize || prev.pageSize
                }));
              }}
              showSizeChanger
              showQuickJumper
              showTotal={(total, range) =>
                `第 ${range[0]}-${range[1]} 条，共 ${total} 条`
              }
            />
          </div>
        </Card>

        <Modal
          title="评论审核"
          open={moderationModal}
          onCancel={() => setModerationModal(false)}
          footer={[
            <Button key="cancel" onClick={() => setModerationModal(false)}>
              取消
            </Button>,
            <Button
              key="approve"
              type="primary"
              icon={<CheckOutlined />}
              onClick={() => currentComment && handleModerateComment(currentComment.id, 'approve')}
            >
              通过
            </Button>,
            <Button
              key="reject"
              danger
              icon={<CloseOutlined />}
              onClick={() => currentComment && handleModerateComment(currentComment.id, 'reject')}
            >
              拒绝
            </Button>
          ]}
        >
          {currentComment && (
            <div>
              <Text strong>评论内容：</Text>
              <div style={{ margin: '8px 0', padding: 12, backgroundColor: '#f5f5f5', borderRadius: 4 }}>
                {currentComment.content}
              </div>
              <Text strong>用户：</Text>
              <div style={{ margin: '8px 0' }}>
                {currentComment.username} ({currentComment.email})
              </div>
              <Text strong>音频：</Text>
              <div style={{ margin: '8px 0' }}>
                {currentComment.audioTitle}
              </div>
              <Text strong>审核原因：</Text>
              <TextArea
                placeholder="请输入审核原因（可选）"
                value={moderationReason}
                onChange={(e) => setModerationReason(e.target.value)}
                rows={3}
                style={{ marginTop: 8 }}
              />
            </div>
          )}
        </Modal>
      </div>
    </AntdAdminLayout>
  );
}

export default withAdminAuth(CommentModerationPage);
