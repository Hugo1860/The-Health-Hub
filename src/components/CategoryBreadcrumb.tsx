'use client';

import React, { useMemo } from 'react';
import { Breadcrumb, Space } from 'antd';
import { 
  HomeOutlined, 
  FolderOutlined, 
  TagOutlined,
  RightOutlined 
} from '@ant-design/icons';
import Link from 'next/link';
import { CategoryBreadcrumbProps } from '@/types/category';
import { useCategories } from '@/contexts/CategoriesContextNew';

export const CategoryBreadcrumb: React.FC<CategoryBreadcrumbProps> = ({
  categoryId,
  subcategoryId,
  onNavigate,
  separator = '/',
  showHome = true,
  maxLength = 50
}) => {
  const { getCategoryPath } = useCategories();

  // 获取分类路径信息
  const categoryPath = useMemo(() => {
    return getCategoryPath(categoryId, subcategoryId);
  }, [categoryId, subcategoryId, getCategoryPath]);

  // 构建面包屑项
  const breadcrumbItems = useMemo(() => {
    const items = [];

    // 首页
    if (showHome) {
      items.push({
        key: 'home',
        title: (
          <Space>
            <HomeOutlined />
            <span>首页</span>
          </Space>
        ),
        href: '/',
        onClick: () => onNavigate?.()
      });
    }

    // 一级分类
    if (categoryPath.category) {
      const category = categoryPath.category;
      const truncatedName = category.name.length > maxLength 
        ? `${category.name.substring(0, maxLength)}...` 
        : category.name;

      items.push({
        key: category.id,
        title: (
          <Space>
            <span 
              style={{ color: category.color }}
              className="inline-flex items-center"
            >
              {category.icon || <FolderOutlined />}
            </span>
            <span title={category.name}>{truncatedName}</span>
          </Space>
        ),
        href: `/category/${category.id}`,
        onClick: () => onNavigate?.(category.id)
      });
    }

    // 二级分类
    if (categoryPath.subcategory) {
      const subcategory = categoryPath.subcategory;
      const truncatedName = subcategory.name.length > maxLength 
        ? `${subcategory.name.substring(0, maxLength)}...` 
        : subcategory.name;

      items.push({
        key: subcategory.id,
        title: (
          <Space>
            <TagOutlined />
            <span title={subcategory.name}>{truncatedName}</span>
          </Space>
        ),
        href: `/category/${categoryId}/${subcategory.id}`,
        onClick: () => onNavigate?.(categoryId, subcategory.id)
      });
    }

    return items;
  }, [categoryPath, showHome, maxLength, onNavigate, categoryId]);

  // 如果没有分类信息且不显示首页，则不渲染
  if (!showHome && breadcrumbItems.length <= 1) {
    return null;
  }

  return (
    <div className="category-breadcrumb">
      <Breadcrumb
        separator={separator === '/' ? <RightOutlined /> : separator}
        items={breadcrumbItems.map(item => ({
          key: item.key,
          title: onNavigate ? (
            <button
              type="button"
              onClick={item.onClick}
              className="text-blue-600 hover:text-blue-800 transition-colors bg-transparent border-none cursor-pointer p-0 font-inherit"
            >
              {item.title}
            </button>
          ) : item.href ? (
            <Link 
              href={item.href}
              className="text-blue-600 hover:text-blue-800 transition-colors"
            >
              {item.title}
            </Link>
          ) : (
            <span className="text-gray-600">{item.title}</span>
          )
        }))}
      />

      {/* 分类描述 */}
      {categoryPath.subcategory?.description && (
        <div className="mt-1 text-xs text-gray-500">
          {categoryPath.subcategory.description}
        </div>
      )}
      {!categoryPath.subcategory && categoryPath.category?.description && (
        <div className="mt-1 text-xs text-gray-500">
          {categoryPath.category.description}
        </div>
      )}
    </div>
  );
};

// 简化版面包屑组件，只显示路径文本
export const SimpleCategoryBreadcrumb: React.FC<{
  categoryId?: string;
  subcategoryId?: string;
  separator?: string;
  className?: string;
}> = ({
  categoryId,
  subcategoryId,
  separator = ' > ',
  className = ''
}) => {
  const { getCategoryPath } = useCategories();

  const pathText = useMemo(() => {
    const path = getCategoryPath(categoryId, subcategoryId);
    return path.breadcrumb.join(separator);
  }, [categoryId, subcategoryId, separator, getCategoryPath]);

  if (!pathText) {
    return null;
  }

  return (
    <span className={`text-gray-600 text-sm ${className}`}>
      {pathText}
    </span>
  );
};

export default CategoryBreadcrumb;