'use client';

import React, { useState, useEffect } from 'react';
import {
  Modal,
  Alert,
  Checkbox,
  Space,
  Typography,
  List,
  Tag,
  Divider,
  Button,
  Spin
} from 'antd';
import {
  ExclamationCircleOutlined,
  DeleteOutlined,
  FolderOutlined,
  TagOutlined,
  SoundOutlined
} from '@ant-design/icons';
import { Category, CategoryLevel } from '@/types/category';

const { Text, Title } = Typography;

interface CategoryDeleteModalProps {
  visible: boolean;
  categories: Category[];
  allCategories: Category[];
  onConfirm: (options: {
    force: boolean;
    cascade: boolean;
    updateAudios: boolean;
  }) => Promise<void>;
  onCancel: () => void;
  loading?: boolean;
}

interface DeleteImpact {
  hasChildren: boolean;
  childrenCount: number;
  hasAudios: boolean;
  audioCount: number;
  affectedCategories: Category[];
  canSafeDelete: boolean;
}

export const CategoryDeleteModal: React.FC<CategoryDeleteModalProps> = ({
  visible,
  categories,
  allCategories,
  onConfirm,
  onCancel,
  loading = false
}) => {
  const [force, setForce] = useState(false);
  const [cascade, setCascade] = useState(false);
  const [updateAudios, setUpdateAudios] = useState(true);
  const [impact, setImpact] = useState<DeleteImpact | null>(null);

  // 分析删除影响
  useEffect(() => {
    if (!visible || categories.length === 0) {
      setImpact(null);
      return;
    }

    const categoryIds = categories.map(c => c.id);
    let hasChildren = false;
    let childrenCount = 0;
    let hasAudios = false;
    let audioCount = 0;
    const affectedCategories: Category[] = [];

    // 检查每个要删除的分类
    for (const category of categories) {
      // 检查是否有子分类
      const children = allCategories.filter(c => c.parentId === category.id);
      if (children.length > 0) {
        hasChildren = true;
        childrenCount += children.length;
        affectedCategories.push(...children);
      }

      // 检查是否有关联音频
      if ((category.audioCount || 0) > 0) {
        hasAudios = true;
        audioCount += category.audioCount || 0;
      }
    }

    const canSafeDelete = !hasChildren && !hasAudios;

    setImpact({
      hasChildren,
      childrenCount,
      hasAudios,
      audioCount,
      affectedCategories,
      canSafeDelete
    });

    // 重置选项
    setForce(false);
    setCascade(hasChildren);
    setUpdateAudios(hasAudios);
  }, [visible, categories, allCategories]);

  const handleConfirm = async () => {
    await onConfirm({
      force: force || !impact?.canSafeDelete,
      cascade,
      updateAudios
    });
  };

  const renderCategoryItem = (category: Category) => (
    <List.Item key={category.id}>
      <Space>
        {category.level === CategoryLevel.PRIMARY ? (
          <FolderOutlined style={{ color: category.color }} />
        ) : (
          <TagOutlined style={{ color: category.color }} />
        )}
        <Text strong>{category.name}</Text>
        {category.audioCount !== undefined && category.audioCount > 0 && (
          <Tag icon={<SoundOutlined />} color="blue">
            {category.audioCount} 个音频
          </Tag>
        )}
        {!category.isActive && (
          <Tag color="default">已停用</Tag>
        )}
      </Space>
    </List.Item>
  );

  const getDeleteWarningType = () => {
    if (!impact) return 'info';
    if (!impact.canSafeDelete) return 'error';
    return 'warning';
  };

  const getDeleteWarningMessage = () => {
    if (!impact) return '正在分析删除影响...';
    
    if (impact.canSafeDelete) {
      return '可以安全删除这些分类';
    }

    const issues = [];
    if (impact.hasChildren) {
      issues.push(`${impact.childrenCount} 个子分类`);
    }
    if (impact.hasAudios) {
      issues.push(`${impact.audioCount} 个关联音频`);
    }

    return `删除这些分类将影响 ${issues.join(' 和 ')}`;
  };

  const getDeleteWarningDescription = () => {
    if (!impact || impact.canSafeDelete) {
      return '这些分类没有子分类或关联音频，可以安全删除。';
    }

    const descriptions = [];
    
    if (impact.hasChildren) {
      descriptions.push(
        `• ${impact.childrenCount} 个子分类将${cascade ? '被一并删除' : '变成孤立分类'}`
      );
    }
    
    if (impact.hasAudios) {
      descriptions.push(
        `• ${impact.audioCount} 个音频的分类关联将${updateAudios ? '被清除' : '保持不变（可能导致数据不一致）'}`
      );
    }

    return descriptions.join('\n');
  };

  return (
    <Modal
      title={
        <Space>
          <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
          <span>确认删除分类</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      width={600}
      footer={[
        <Button key="cancel" onClick={onCancel} disabled={loading}>
          取消
        </Button>,
        <Button
          key="confirm"
          type="primary"
          danger
          icon={<DeleteOutlined />}
          onClick={handleConfirm}
          loading={loading}
          disabled={!impact}
        >
          {loading ? '删除中...' : '确认删除'}
        </Button>
      ]}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* 要删除的分类列表 */}
        <div>
          <Title level={5}>要删除的分类 ({categories.length} 个)</Title>
          <List
            size="small"
            dataSource={categories}
            renderItem={renderCategoryItem}
            style={{ 
              maxHeight: 200, 
              overflow: 'auto',
              border: '1px solid #f0f0f0',
              borderRadius: 6,
              padding: 8
            }}
          />
        </div>

        {/* 删除影响分析 */}
        {impact ? (
          <Alert
            type={getDeleteWarningType()}
            message={getDeleteWarningMessage()}
            description={getDeleteWarningDescription()}
            showIcon
          />
        ) : (
          <div style={{ textAlign: 'center', padding: 20 }}>
            <Spin tip="正在分析删除影响..." />
          </div>
        )}

        {/* 受影响的子分类 */}
        {impact && impact.hasChildren && (
          <div>
            <Title level={5}>受影响的子分类 ({impact.childrenCount} 个)</Title>
            <List
              size="small"
              dataSource={impact.affectedCategories}
              renderItem={renderCategoryItem}
              style={{ 
                maxHeight: 150, 
                overflow: 'auto',
                border: '1px solid #f0f0f0',
                borderRadius: 6,
                padding: 8
              }}
            />
          </div>
        )}

        {/* 删除选项 */}
        {impact && !impact.canSafeDelete && (
          <>
            <Divider />
            <div>
              <Title level={5}>删除选项</Title>
              <Space direction="vertical" style={{ width: '100%' }}>
                {impact.hasChildren && (
                  <Checkbox
                    checked={cascade}
                    onChange={(e) => setCascade(e.target.checked)}
                  >
                    <Space direction="vertical" size={0}>
                      <Text>级联删除子分类</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        同时删除所有子分类，否则子分类将变成孤立分类
                      </Text>
                    </Space>
                  </Checkbox>
                )}

                {impact.hasAudios && (
                  <Checkbox
                    checked={updateAudios}
                    onChange={(e) => setUpdateAudios(e.target.checked)}
                  >
                    <Space direction="vertical" size={0}>
                      <Text>清除音频分类关联</Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        将关联音频的分类设为空，否则可能导致数据不一致
                      </Text>
                    </Space>
                  </Checkbox>
                )}

                <Checkbox
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                >
                  <Space direction="vertical" size={0}>
                    <Text strong style={{ color: '#ff4d4f' }}>
                      强制删除
                    </Text>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      跳过安全检查，强制执行删除操作
                    </Text>
                  </Space>
                </Checkbox>
              </Space>
            </div>
          </>
        )}

        {/* 警告信息 */}
        <Alert
          type="warning"
          message="删除操作不可撤销"
          description="请确认您真的要删除这些分类。删除后的数据无法恢复。"
          showIcon
        />
      </Space>
    </Modal>
  );
};

export default CategoryDeleteModal;