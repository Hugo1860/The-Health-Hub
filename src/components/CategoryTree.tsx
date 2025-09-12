'use client';

import React, { useState, useMemo, useCallback } from 'react';
import { Tree, Button, Space, Dropdown, Modal, message, Tooltip, Badge } from 'antd';
import {
  FolderOutlined,
  FolderOpenOutlined,
  TagOutlined,
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  DragOutlined,
  EyeOutlined,
  EyeInvisibleOutlined
} from '@ant-design/icons';
import CategoryDeleteModal from './CategoryDeleteModal';
import type { TreeProps, TreeDataNode } from 'antd/es/tree';
import {
  CategoryTreeProps,
  Category,
  CategoryTreeNode,
  CategoryLevel
} from '@/types/category';

interface ExtendedTreeDataNode extends TreeDataNode {
  category: Category;
  level: CategoryLevel;
  audioCount?: number;
}

interface CategoryTreePropsExtended extends CategoryTreeProps {
  onCheck?: (checkedCategories: Category[]) => void;
}

export const CategoryTree: React.FC<CategoryTreePropsExtended> = ({
  categories,
  onSelect,
  onEdit,
  onDelete,
  onReorder,
  onCheck,
  showAudioCount = true,
  expandAll = false,
  draggable = false,
  checkable = false,
  selectedKeys = [],
  expandedKeys: controlledExpandedKeys,
  loading = false
}) => {
  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>(
    controlledExpandedKeys || (expandAll ? [] : [])
  );
  const [selectedTreeKeys, setSelectedTreeKeys] = useState<React.Key[]>(selectedKeys);
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([]);
  const [dragOverKey, setDragOverKey] = useState<React.Key>('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [categoriesToDelete, setCategoriesToDelete] = useState<Category[]>([]);

  // 转换分类数据为树形数据
  const treeData = useMemo(() => {
    const convertToTreeData = (nodes: CategoryTreeNode[]): ExtendedTreeDataNode[] => {
      return nodes.map(node => ({
        key: node.id,
        title: renderTreeNodeTitle(node),
        icon: renderTreeNodeIcon(node),
        children: node.children?.map(child => ({
          key: child.id,
          title: renderTreeNodeTitle(child),
          icon: renderTreeNodeIcon(child),
          category: child,
          level: CategoryLevel.SECONDARY,
          audioCount: child.audioCount,
          isLeaf: true
        })),
        category: node,
        level: CategoryLevel.PRIMARY,
        audioCount: node.audioCount,
        isLeaf: !node.children || node.children.length === 0
      }));
    };

    return convertToTreeData(categories);
  }, [categories, showAudioCount]);

  // 渲染树节点标题
  const renderTreeNodeTitle = useCallback((category: Category) => {
    const isActive = category.isActive;
    
    return (
      <div className="flex items-center justify-between w-full group">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span 
            className={`font-medium truncate ${
              isActive ? 'text-gray-900' : 'text-gray-400 line-through'
            }`}
          >
            {category.name}
          </span>
          
          {showAudioCount && category.audioCount !== undefined && (
            <Badge 
              count={category.audioCount} 
              size="small"
              style={{ 
                backgroundColor: isActive ? category.color || '#1890ff' : '#d9d9d9'
              }}
            />
          )}
          
          {!isActive && (
            <Tooltip title="已停用">
              <EyeInvisibleOutlined className="text-gray-400 text-xs" />
            </Tooltip>
          )}
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Dropdown
            menu={{
              items: getContextMenuItems(category),
              onClick: ({ key }) => handleContextMenuClick(key, category)
            }}
            trigger={['click']}
            placement="bottomRight"
          >
            <Button
              type="text"
              size="small"
              icon={<MoreOutlined />}
              onClick={(e) => e.stopPropagation()}
            />
          </Dropdown>
        </div>
      </div>
    );
  }, [showAudioCount, onEdit, onDelete]);

  // 渲染树节点图标
  const renderTreeNodeIcon = useCallback((category: Category) => {
    const IconComponent = category.level === CategoryLevel.PRIMARY 
      ? (expandedKeys.includes(category.id) ? FolderOpenOutlined : FolderOutlined)
      : TagOutlined;
    
    return (
      <IconComponent 
        style={{ 
          color: category.isActive ? (category.color || '#1890ff') : '#d9d9d9'
        }} 
      />
    );
  }, [expandedKeys]);

  // 获取上下文菜单项
  const getContextMenuItems = useCallback((category: Category) => {
    const items = [
      {
        key: 'view',
        label: '查看详情',
        icon: <EyeOutlined />
      }
    ];

    if (onEdit) {
      items.push({
        key: 'edit',
        label: '编辑',
        icon: <EditOutlined />
      });
    }

    if (category.level === CategoryLevel.PRIMARY) {
      items.push({
        key: 'addChild',
        label: '添加子分类',
        icon: <PlusOutlined />
      });
    }

    if (onDelete) {
      items.push({
        type: 'divider'
      });
      items.push({
        key: 'delete',
        label: '删除',
        icon: <DeleteOutlined />,
        danger: true
      });
    }

    return items;
  }, [onEdit, onDelete]);

  // 处理上下文菜单点击
  const handleContextMenuClick = useCallback((key: string, category: Category) => {
    switch (key) {
      case 'view':
        if (onSelect) {
          onSelect(category);
        }
        break;
      case 'edit':
        if (onEdit) {
          onEdit(category);
        }
        break;
      case 'addChild':
        if (onEdit) {
          // 创建新的子分类
          onEdit({
            ...category,
            id: '', // 空ID表示新建
            name: '',
            parentId: category.id,
            level: CategoryLevel.SECONDARY
          } as Category);
        }
        break;
      case 'delete':
        if (onDelete) {
          setCategoriesToDelete([category]);
          setDeleteModalVisible(true);
        }
        break;
    }
  }, [onSelect, onEdit, onDelete, categories]);

  // 处理树节点选择
  const handleSelect: TreeProps['onSelect'] = useCallback((keys, info) => {
    setSelectedTreeKeys(keys);
    if (onSelect && info.node) {
      const nodeData = info.node as ExtendedTreeDataNode;
      onSelect(nodeData.category);
    }
  }, [onSelect]);

  // 处理树节点展开
  const handleExpand: TreeProps['onExpand'] = useCallback((keys) => {
    setExpandedKeys(keys);
  }, []);

  // 处理复选框选择
  const handleCheck: TreeProps['onCheck'] = useCallback((keys, info) => {
    const checkedKeyArray = Array.isArray(keys) ? keys : keys.checked;
    setCheckedKeys(checkedKeyArray);
    
    if (onCheck) {
      const checkedCategories = allCategoriesFlat.filter(cat => 
        checkedKeyArray.includes(cat.id)
      );
      onCheck(checkedCategories);
    }
  }, [onCheck, allCategoriesFlat]);

  // 处理拖拽
  const handleDrop: TreeProps['onDrop'] = useCallback((info) => {
    if (!onReorder || !draggable) return;

    const dropKey = info.node.key;
    const dragKey = info.dragNode.key;
    const dropPos = info.node.pos.split('-');
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1]);

    // 构建重排序请求
    const reorderRequests = [
      {
        categoryId: dragKey as string,
        newSortOrder: dropPosition,
        parentId: info.node.category?.parentId
      }
    ];

    onReorder(reorderRequests);
  }, [onReorder, draggable]);

  // 处理拖拽悬停
  const handleDragEnter: TreeProps['onDragEnter'] = useCallback((info) => {
    setDragOverKey(info.node.key);
  }, []);

  // 处理拖拽离开
  const handleDragLeave: TreeProps['onDragLeave'] = useCallback(() => {
    setDragOverKey('');
  }, []);

  // 处理删除确认
  const handleDeleteConfirm = useCallback(async (options: {
    force: boolean;
    cascade: boolean;
    updateAudios: boolean;
  }) => {
    if (!onDelete || categoriesToDelete.length === 0) return;

    try {
      // 如果是单个分类删除，直接调用 onDelete
      if (categoriesToDelete.length === 1) {
        await onDelete(categoriesToDelete[0]);
      } else {
        // 批量删除需要特殊处理
        for (const category of categoriesToDelete) {
          await onDelete(category);
        }
      }
      
      setDeleteModalVisible(false);
      setCategoriesToDelete([]);
      message.success('分类删除成功');
    } catch (error) {
      message.error('删除失败: ' + (error instanceof Error ? error.message : '未知错误'));
    }
  }, [onDelete, categoriesToDelete]);

  // 处理删除取消
  const handleDeleteCancel = useCallback(() => {
    setDeleteModalVisible(false);
    setCategoriesToDelete([]);
  }, []);

  // 获取所有分类的扁平列表（用于删除影响分析）
  const allCategoriesFlat = useMemo(() => {
    const result: Category[] = [];
    categories.forEach(category => {
      result.push(category);
      if (category.children) {
        result.push(...category.children);
      }
    });
    return result;
  }, [categories]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  if (!categories || categories.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <FolderOutlined className="text-2xl mb-2" />
        <div>暂无分类</div>
      </div>
    );
  }

  return (
    <div className="category-tree">
      <Tree
        treeData={treeData}
        selectedKeys={selectedTreeKeys}
        checkedKeys={checkedKeys}
        expandedKeys={expandedKeys}
        onSelect={handleSelect}
        onCheck={checkable ? handleCheck : undefined}
        onExpand={handleExpand}
        onDrop={draggable ? handleDrop : undefined}
        onDragEnter={draggable ? handleDragEnter : undefined}
        onDragLeave={draggable ? handleDragLeave : undefined}
        draggable={draggable ? {
          icon: <DragOutlined />,
          nodeDraggable: (node) => {
            const nodeData = node as ExtendedTreeDataNode;
            return nodeData.category.isActive; // 只允许拖拽激活的分类
          }
        } : false}
        checkable={checkable}
        showIcon
        showLine={{ showLeafIcon: false }}
        blockNode
        className="custom-category-tree"
      />

      <style jsx>{`
        .custom-category-tree .ant-tree-node-content-wrapper {
          width: 100%;
        }
        
        .custom-category-tree .ant-tree-title {
          width: 100%;
        }
        
        .custom-category-tree .ant-tree-node-selected {
          background-color: #e6f7ff !important;
        }
        
        .custom-category-tree .ant-tree-draggable-icon {
          color: #1890ff;
        }
      `}</style>

      {/* 删除确认模态框 */}
      <CategoryDeleteModal
        visible={deleteModalVisible}
        categories={categoriesToDelete}
        allCategories={allCategoriesFlat}
        onConfirm={handleDeleteConfirm}
        onCancel={handleDeleteCancel}
      />
    </div>
  );
};

export default CategoryTree;