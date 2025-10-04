'use client';

import React, { useState, useEffect } from 'react';
import {
  Card,
  List,
  Button,
  Typography,
  Space,
  Tag,
  Avatar,
  Modal,
  Form,
  Input,
  Switch,
  Select,
  message,
  Popconfirm,
  Tooltip,
  Progress,
  Empty,
  Row,
  Col
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ShareAltOutlined,
  TeamOutlined,
  LockOutlined,
  UnlockOutlined,
  DragOutlined
} from '@ant-design/icons';
import { useSession } from 'next-auth/react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const { Title, Text } = Typography;
const { TextArea } = Input;
const { Option } = Select;

interface Playlist {
  id: string;
  name: string;
  description?: string;
  coverImage?: string;
  isPublic: boolean;
  isCollaborative: boolean;
  totalDuration: number;
  audioCount: number;
  playCount: number;
  likeCount: number;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

interface PlaylistItem {
  id: string;
  audioId: string;
  position: number;
  personalNote?: string;
  audio?: {
    title: string;
    duration?: number;
    speaker?: string;
    categoryName?: string;
  };
}

export default function AdvancedPlaylistManager() {
  const { data: session } = useSession();
  const [playlists, setPlaylists] = useState<Playlist[]>([]);
  const [selectedPlaylist, setSelectedPlaylist] = useState<Playlist | null>(null);
  const [playlistItems, setPlaylistItems] = useState<PlaylistItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [form] = Form.useForm();

  // 获取播放列表
  const fetchPlaylists = async () => {
    if (!session?.user) return;

    try {
      setLoading(true);
      const response = await fetch('/api/user/playlists?includeCollaborative=true');
      const result = await response.json();

      if (result.success) {
        setPlaylists(result.data);
      }
    } catch (error) {
      console.error('获取播放列表失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 获取播放列表项目
  const fetchPlaylistItems = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/user/playlists/${playlistId}/items`);
      const result = await response.json();

      if (result.success) {
        setPlaylistItems(result.data);
      }
    } catch (error) {
      console.error('获取播放列表项目失败:', error);
    }
  };

  // 创建播放列表
  const createPlaylist = async (values: any) => {
    try {
      const response = await fetch('/api/user/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      });

      if (response.ok) {
        message.success('播放列表创建成功');
        setCreateModalVisible(false);
        form.resetFields();
        fetchPlaylists();
      } else {
        message.error('创建失败');
      }
    } catch (error) {
      console.error('创建播放列表失败:', error);
      message.error('创建失败');
    }
  };

  // 删除播放列表
  const deletePlaylist = async (playlistId: string) => {
    try {
      const response = await fetch(`/api/user/playlists/${playlistId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        message.success('播放列表删除成功');
        fetchPlaylists();
        if (selectedPlaylist?.id === playlistId) {
          setSelectedPlaylist(null);
          setPlaylistItems([]);
        }
      } else {
        message.error('删除失败');
      }
    } catch (error) {
      console.error('删除播放列表失败:', error);
      message.error('删除失败');
    }
  };

  // 拖拽重排序
  const handleDragEnd = async (result: any) => {
    if (!result.destination || !selectedPlaylist) return;

    const items = Array.from(playlistItems);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setPlaylistItems(items);

    try {
      const response = await fetch(`/api/user/playlists/${selectedPlaylist.id}/reorder`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          itemIds: items.map(item => item.id)
        })
      });

      if (!response.ok) {
        message.error('重排序失败');
        fetchPlaylistItems(selectedPlaylist.id); // 恢复原序
      }
    } catch (error) {
      console.error('重排序失败:', error);
      message.error('重排序失败');
      fetchPlaylistItems(selectedPlaylist.id); // 恢复原序
    }
  };

  // 格式化时长
  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return hours > 0 ? `${hours}:${minutes.toString().padStart(2, '0')}:00` : `${minutes}:00`;
  };

  useEffect(() => {
    fetchPlaylists();
  }, [session]);

  useEffect(() => {
    if (selectedPlaylist) {
      fetchPlaylistItems(selectedPlaylist.id);
    }
  }, [selectedPlaylist]);

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>播放列表管理</Title>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setCreateModalVisible(true)}
        >
          创建播放列表
        </Button>
      </div>

      <Row gutter={[24, 24]}>
        {/* 播放列表列表 */}
        <Col xs={24} lg={10}>
          <Card title="我的播放列表">
            <List
              loading={loading}
              dataSource={playlists}
              renderItem={(playlist) => (
                <List.Item
                  className={selectedPlaylist?.id === playlist.id ? 'selected-playlist' : ''}
                  style={{
                    cursor: 'pointer',
                    backgroundColor: selectedPlaylist?.id === playlist.id ? '#f0f9ff' : 'transparent',
                    borderRadius: 8,
                    marginBottom: 8,
                    padding: 12
                  }}
                  onClick={() => setSelectedPlaylist(playlist)}
                  actions={[
                    <Tooltip key="visibility" title={playlist.isPublic ? '公开' : '私有'}>
                      {playlist.isPublic ? <UnlockOutlined /> : <LockOutlined />}
                    </Tooltip>,
                    <Tooltip key="collaborative" title={playlist.isCollaborative ? '协作' : '个人'}>
                      {playlist.isCollaborative ? <TeamOutlined /> : <EditOutlined />}
                    </Tooltip>,
                    <Popconfirm
                      key="delete"
                      title="确定删除此播放列表吗？"
                      onConfirm={() => deletePlaylist(playlist.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                  ]}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar
                        size="large"
                        style={{ backgroundColor: '#1890ff' }}
                        icon={<PlayCircleOutlined />}
                      />
                    }
                    title={
                      <div>
                        <Text strong>{playlist.name}</Text>
                        <Space style={{ marginLeft: 8 }}>
                          {playlist.isPublic && <Tag color="green">公开</Tag>}
                          {playlist.isCollaborative && <Tag color="blue">协作</Tag>}
                        </Space>
                      </div>
                    }
                    description={
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {playlist.audioCount} 个音频 • {formatDuration(playlist.totalDuration)}
                        </Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          播放 {playlist.playCount} 次 • {playlist.likeCount} 个赞
                        </Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </Col>

        {/* 播放列表详情 */}
        <Col xs={24} lg={14}>
          {selectedPlaylist ? (
            <Card
              title={
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{selectedPlaylist.name}</span>
                  <Space>
                    <Button
                      icon={<EditOutlined />}
                      onClick={() => {
                        form.setFieldsValue(selectedPlaylist);
                        setEditModalVisible(true);
                      }}
                    >
                      编辑
                    </Button>
                    <Button
                      icon={<ShareAltOutlined />}
                      onClick={() => {
                        setSelectedContent({
                          type: 'playlist',
                          id: selectedPlaylist.id,
                          title: selectedPlaylist.name
                        });
                        setShareModalVisible(true);
                      }}
                    >
                      分享
                    </Button>
                  </Space>
                </div>
              }
            >
              {/* 播放列表信息 */}
              <div style={{ marginBottom: 16 }}>
                <Space>
                  <Text type="secondary">
                    {selectedPlaylist.audioCount} 个音频
                  </Text>
                  <Text type="secondary">
                    总时长 {formatDuration(selectedPlaylist.totalDuration)}
                  </Text>
                  <Text type="secondary">
                    播放 {selectedPlaylist.playCount} 次
                  </Text>
                </Space>
              </div>

              {/* 音频列表 */}
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="playlist-items">
                  {(provided) => (
                    <div {...provided.droppableProps} ref={provided.innerRef}>
                      <List
                        dataSource={playlistItems}
                        locale={{ emptyText: <Empty description="播放列表为空" /> }}
                        renderItem={(item, index) => (
                          <Draggable
                            key={item.id}
                            draggableId={item.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                style={{
                                  ...provided.draggableProps.style,
                                  backgroundColor: snapshot.isDragging ? '#f0f9ff' : 'transparent',
                                  borderRadius: 8,
                                  marginBottom: 8
                                }}
                              >
                                <List.Item
                                  actions={[
                                    <Button
                                      key="play"
                                      type="text"
                                      icon={<PlayCircleOutlined />}
                                      onClick={() => {
                                        // 播放音频逻辑
                                        window.location.href = `/audio/${item.audioId}`;
                                      }}
                                    >
                                      播放
                                    </Button>,
                                    <Button
                                      key="remove"
                                      type="text"
                                      danger
                                      icon={<DeleteOutlined />}
                                      onClick={() => {
                                        // 移除音频逻辑
                                      }}
                                    >
                                      移除
                                    </Button>
                                  ]}
                                >
                                  <List.Item.Meta
                                    avatar={
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <div
                                          {...provided.dragHandleProps}
                                          style={{ cursor: 'grab', color: '#999' }}
                                        >
                                          <DragOutlined />
                                        </div>
                                        <Avatar
                                          style={{ backgroundColor: '#1890ff' }}
                                          icon={<PlayCircleOutlined />}
                                        />
                                      </div>
                                    }
                                    title={
                                      <div>
                                        <Text strong>{item.audio?.title}</Text>
                                        {item.audio?.categoryName && (
                                          <Tag style={{ marginLeft: 8 }}>
                                            {item.audio.categoryName}
                                          </Tag>
                                        )}
                                      </div>
                                    }
                                    description={
                                      <div>
                                        <Space>
                                          {item.audio?.speaker && (
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                              讲者: {item.audio.speaker}
                                            </Text>
                                          )}
                                          {item.audio?.duration && (
                                            <Text type="secondary" style={{ fontSize: '12px' }}>
                                              时长: {formatDuration(item.audio.duration)}
                                            </Text>
                                          )}
                                        </Space>
                                        {item.personalNote && (
                                          <div style={{ marginTop: 4 }}>
                                            <Text
                                              type="secondary"
                                              style={{ fontSize: '12px', fontStyle: 'italic' }}
                                            >
                                              笔记: {item.personalNote}
                                            </Text>
                                          </div>
                                        )}
                                      </div>
                                    }
                                  />
                                </List.Item>
                              </div>
                            )}
                          </Draggable>
                        )}
                      />
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </Card>
          ) : (
            <Card>
              <Empty description="请选择一个播放列表" />
            </Card>
          )}
        </Col>
      </Row>

      {/* 创建播放列表模态框 */}
      <Modal
        title="创建播放列表"
        open={createModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setCreateModalVisible(false);
          form.resetFields();
        }}
        okText="创建"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={createPlaylist}
        >
          <Form.Item
            name="name"
            label="播放列表名称"
            rules={[{ required: true, message: '请输入播放列表名称' }]}
          >
            <Input placeholder="输入播放列表名称" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea placeholder="描述这个播放列表..." rows={3} maxLength={500} />
          </Form.Item>

          <Form.Item
            name="tags"
            label="标签"
          >
            <Select
              mode="tags"
              placeholder="添加标签"
              maxTagCount={10}
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isPublic"
                label="公开播放列表"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isCollaborative"
                label="允许协作"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>

      {/* 编辑播放列表模态框 */}
      <Modal
        title="编辑播放列表"
        open={editModalVisible}
        onOk={() => form.submit()}
        onCancel={() => {
          setEditModalVisible(false);
          form.resetFields();
        }}
        okText="保存"
        cancelText="取消"
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => {
            // 更新播放列表逻辑
            console.log('Update playlist:', values);
            setEditModalVisible(false);
          }}
        >
          <Form.Item
            name="name"
            label="播放列表名称"
            rules={[{ required: true, message: '请输入播放列表名称' }]}
          >
            <Input placeholder="输入播放列表名称" maxLength={100} />
          </Form.Item>

          <Form.Item
            name="description"
            label="描述"
          >
            <TextArea placeholder="描述这个播放列表..." rows={3} maxLength={500} />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="isPublic"
                label="公开播放列表"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="isCollaborative"
                label="允许协作"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}

// CSS样式（可以移到单独的CSS文件）
const styles = `
.selected-playlist {
  border: 2px solid #1890ff !important;
}
`;
