'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Select, Space, Spin, Alert } from 'antd';
import { FolderOutlined, TagOutlined, ClearOutlined } from '@ant-design/icons';
import {
  CategorySelectorProps,
  CategoryLevel,
  CategoryOption,
  CategorySelection
} from '@/types/category';
import { useCategories } from '@/contexts/CategoriesContextNew';

const { Option } = Select;

export const CategorySelector: React.FC<CategorySelectorProps> = ({
  value,
  onChange,
  allowEmpty = true,
  level = 'both',
  placeholder = {
    category: '请选择一级分类',
    subcategory: '请选择二级分类'
  },
  disabled = false,
  size = 'middle',
  showSearch = true,
  loading: externalLoading = false
}) => {
  const {
    categories,
    loading: contextLoading,
    error,
    getCategoryOptions,
    getSubcategoryOptions
  } = useCategories();

  const [internalValue, setInternalValue] = useState<CategorySelection>(
    value || { categoryId: undefined, subcategoryId: undefined }
  );

  const loading = externalLoading || contextLoading;

  // 同步外部值变化
  useEffect(() => {
    if (value) {
      setInternalValue(value);
    }
  }, [value]);

  // 获取一级分类选项
  const categoryOptions = useMemo(() => {
    if (level === CategoryLevel.SECONDARY) {
      return [];
    }
    return getCategoryOptions(CategoryLevel.PRIMARY);
  }, [categories, level, getCategoryOptions]);

  // 获取二级分类选项
  const subcategoryOptions = useMemo(() => {
    if (!internalValue.categoryId || level === CategoryLevel.PRIMARY) {
      return [];
    }
    return getSubcategoryOptions(internalValue.categoryId);
  }, [internalValue.categoryId, level, getSubcategoryOptions]);

  // 处理一级分类选择
  const handleCategoryChange = (categoryId: string | undefined) => {
    const newValue: CategorySelection = {
      categoryId,
      subcategoryId: undefined // 清空二级分类选择
    };
    
    setInternalValue(newValue);
    onChange(newValue);
  };

  // 处理二级分类选择
  const handleSubcategoryChange = (subcategoryId: string | undefined) => {
    const newValue: CategorySelection = {
      ...internalValue,
      subcategoryId
    };
    
    setInternalValue(newValue);
    onChange(newValue);
  };

  // 清空选择
  const handleClear = () => {
    const newValue: CategorySelection = {
      categoryId: undefined,
      subcategoryId: undefined
    };
    
    setInternalValue(newValue);
    onChange(newValue);
  };

  // 渲染分类选项
  const renderCategoryOption = (option: CategoryOption) => (
    <Option key={option.key} value={option.value} disabled={option.disabled}>
      <Space>
        <span style={{ color: categories.find(c => c.id === option.value)?.color }}>
          {categories.find(c => c.id === option.value)?.icon || <FolderOutlined />}
        </span>
        <span>{option.label}</span>
        {option.title && (
          <span className="text-gray-400 text-xs">({option.title})</span>
        )}
      </Space>
    </Option>
  );

  // 渲染子分类选项
  const renderSubcategoryOption = (option: CategoryOption) => (
    <Option key={option.key} value={option.value} disabled={option.disabled}>
      <Space>
        <TagOutlined />
        <span>{option.label}</span>
        {option.title && (
          <span className="text-gray-400 text-xs">({option.title})</span>
        )}
      </Space>
    </Option>
  );

  if (error) {
    return (
      <Alert
        message="加载分类失败"
        description={error}
        type="error"
        showIcon
        size="small"
      />
    );
  }

  return (
    <div className="category-selector">
      <Space direction="vertical" style={{ width: '100%' }} size="small">
        {/* 一级分类选择 */}
        {level !== CategoryLevel.SECONDARY && (
          <div>
            <div className="mb-1 text-sm text-gray-600">
              一级分类
              {!allowEmpty && <span className="text-red-500 ml-1">*</span>}
            </div>
            <Select
              value={internalValue.categoryId}
              onChange={handleCategoryChange}
              placeholder={placeholder.category}
              disabled={disabled || loading}
              size={size}
              showSearch={showSearch}
              allowClear={allowEmpty}
              loading={loading}
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.children as any)?.props?.children?.[1]?.props?.children
                  ?.toLowerCase()
                  ?.includes(input.toLowerCase()) ?? false
              }
              notFoundContent={loading ? <Spin size="small" /> : '暂无分类'}
            >
              {categoryOptions.map(renderCategoryOption)}
            </Select>
          </div>
        )}

        {/* 二级分类选择 */}
        {level !== CategoryLevel.PRIMARY && internalValue.categoryId && (
          <div>
            <div className="mb-1 text-sm text-gray-600">
              二级分类
              {level === CategoryLevel.SECONDARY && !allowEmpty && (
                <span className="text-red-500 ml-1">*</span>
              )}
            </div>
            <Select
              value={internalValue.subcategoryId}
              onChange={handleSubcategoryChange}
              placeholder={placeholder.subcategory}
              disabled={disabled || loading || !internalValue.categoryId}
              size={size}
              showSearch={showSearch}
              allowClear={allowEmpty}
              style={{ width: '100%' }}
              filterOption={(input, option) =>
                (option?.children as any)?.props?.children?.[1]?.props?.children
                  ?.toLowerCase()
                  ?.includes(input.toLowerCase()) ?? false
              }
              notFoundContent={
                loading ? (
                  <Spin size="small" />
                ) : subcategoryOptions.length === 0 ? (
                  '该分类下暂无子分类'
                ) : (
                  '暂无匹配的子分类'
                )
              }
            >
              {subcategoryOptions.map(renderSubcategoryOption)}
            </Select>
          </div>
        )}

        {/* 清空按钮 */}
        {allowEmpty && (internalValue.categoryId || internalValue.subcategoryId) && (
          <div className="text-right">
            <button
              type="button"
              onClick={handleClear}
              disabled={disabled || loading}
              className="text-xs text-gray-500 hover:text-gray-700 disabled:text-gray-300 flex items-center gap-1"
            >
              <ClearOutlined />
              清空选择
            </button>
          </div>
        )}
      </Space>

      {/* 选择预览 */}
      {(internalValue.categoryId || internalValue.subcategoryId) && (
        <div className="mt-2 p-2 bg-gray-50 rounded text-xs text-gray-600">
          <div className="font-medium mb-1">当前选择：</div>
          <div className="space-y-1">
            {internalValue.categoryId && (
              <div className="flex items-center gap-1">
                <FolderOutlined />
                <span>
                  {categories.find(c => c.id === internalValue.categoryId)?.name || '未知分类'}
                </span>
              </div>
            )}
            {internalValue.subcategoryId && (
              <div className="flex items-center gap-1 ml-4">
                <TagOutlined />
                <span>
                  {categories.find(c => c.id === internalValue.subcategoryId)?.name || '未知子分类'}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CategorySelector;