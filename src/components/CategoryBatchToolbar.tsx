'use client';

import React, { useState } from 'react';
import {
  Space,
  Button,
  Dropdown,
  message,
  Modal,
  Typography,
  Alert,
  App
} from 'antd';
import {
  DeleteOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  MoreOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons';
import { Category } from '@/types/category';
import CategoryDeleteModal from './CategoryDeleteModal';

const { Text } = Typography;

interface CategoryBatchToolbarProps {
  selectedCategories: Category[];
  allCategories: Category[];
  onBatchDelete: (categoryIds: string[], options?: {
    force?: boolean;
    cascade?: boolean;
  }) => Promise<void>;
  onBatchUpdateStatus: (categoryIds: string[], isActive: boolean) => Promise<void>;
  onClearSelection: () => void;
  loading?: boolean;
}

export const CategoryBatchToolbar: React.FC<CategoryBatchToolbarProps> = ({
  selectedCategories,
  allCategories,
  onBatchDelete,
  onBatchUpdateStatus,
  onClearSelection,
  loading = false
}) => {
  const { modal } = App.useApp();
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [operationLoading, setOperationLoading] = useState(false);

  const selectedCount = selectedCategories.length;
  const selectedIds = selectedCategories.map(c => c.id);

  // 处理批量激活
  const handleBatchActivate = async () => {
    setOperationLoading(true);
    try {
      await onBatchUpdateStatus(selectedIds, true);
      message.success(`成功激活 ${selectedCount} 个分类`);
      onClearSelection();
    } catch (error) {
      message.error('批量激活失败');
    } finally {
      setOperationLoading(false);
    }
  };

  // 处理批量停用
  const handleBatchDeactivate = async () => {
    modal.confirm({
      title: '确认批量停用',
      icon: <ExclamationCircleOutlined />,
      content: `确定要停用选中的 ${selectedCount} 个分类吗？停用后这些分类将不会在前端显示。`,
      okText: '确认停用',
      cancelText: '取消',
      onOk: async () => {
        setOperationLoading(true);
        try {
          await onBatchUpdateStatus(selectedIds, false);
          message.success(`成功停用 ${selectedCount} 个分类`);
          onClearSelection();
        } catch (error) {
          message.error('批量停用失败');
        } finally {
          setOperationLoading(false);
        }
      }
    });
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    setDeleteModalVisible(true);
  };

  // 处理删除确认
  const handleDeleteConfirm = async (options: {
    force: boolean;
    cascade: boolean;
    updateAudios: boolean;
  }) => {
    setOperationLoading(true);
    try {
      await onBatchDelete(selectedIds, {
        force: options.force,
        cascade: options.cascade
      });
      setDeleteModalVisible(false);
      onClearSelection();
    } catch (error) {
      message.error('批量删除失败');
    } finally {
      setOperationLoading(false);
    }
  };

  // 处理删除取消
  const handleDeleteCancel = () => {
    setDeleteModalVisible(false);
  };

  // 获取更多操作菜单
  const getMoreMenuItems = () => {
    const activeCount = selectedCategories.filter(c => c.isActive).length;
    const inactiveCount = selectedCount - activeCount;

    const items = [];

    if (inactiveCount > 0) {
      items.push({
        key: 'activate',
        label: `激活 (${inactiveCount} 个)`,
        icon: <EyeOutlined />,
        onClick: handleBatchActivate
      });
    }

    if (activeCount > 0) {
      items.push({
        key: 'deactivate',
        label: `停用 (${activeCount} 个)`,
        icon: <EyeInvisibleOutlined />,
        onClick: handleBatchDeactivate
      });
    }

    return items;
  };

  if (selectedCount === 0) {
    return null;
  }

  return (
    <>
      <Alert
        message={
          <Space>
            <Text>已选择 {selectedCount} 个分类</Text>
            <Button size="small" type="link" onClick={onClearSelection}>
              清除选择
            </Button>
          </Space>
        }
        type="info"
        showIcon
        action={
          <Space>
            <Button
              type="primary"
              danger
              icon={<DeleteOutlined />}
              onClick={handleBatchDelete}
              loading={operationLoading || loading}
              size="small"
            >
              批量删除
            </Button>
            
            {getMoreMenuItems().length > 0 && (
              <Dropdown
                menu={{
                  items: getMoreMenuItems()
                }}
                placement="bottomRight"
              >
                <Button
                  icon={<MoreOutlined />}
                  loading={operationLoading || loading}
                  size="small"
                >
                  更多操作
                </Button>
              </Dropdown>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      />

      {/* 批量删除确认模态框 */}
      <CategoryDeleteModal
        visible={deleteModalVisible}
        categories={selectedCategories}
        allCategories={allCategories}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
        loading={operationLoading}
      />
    </>
  );
};

export default CategoryBatchToolbar;