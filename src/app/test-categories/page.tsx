'use client';

import { useState, useEffect } from 'react';

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
  createdAt: string;
  updatedAt: string;
}

export default function TestCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">分类测试页面</h1>
        
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">当前分类列表</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map((category) => (
              <div
                key={category.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-center mb-3">
                  <span className="text-2xl mr-3">{category.icon}</span>
                  <div>
                    <h3 className="font-medium text-gray-900">{category.name}</h3>
                    <div className="flex items-center mt-1">
                      <div
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: category.color }}
                      ></div>
                      <span className="text-xs text-gray-500">{category.color}</span>
                    </div>
                  </div>
                </div>
                
                {category.description && (
                  <p className="text-sm text-gray-600 mb-2">{category.description}</p>
                )}
                
                <div className="text-xs text-gray-500">
                  <div>ID: {category.id}</div>
                  <div>创建: {new Date(category.createdAt).toLocaleDateString('zh-CN')}</div>
                </div>
              </div>
            ))}
          </div>
          
          {categories.length === 0 && (
            <div className="text-center py-8">
              <p className="text-gray-500">暂无分类数据</p>
            </div>
          )}
        </div>
        
        <div className="mt-8 bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">功能说明</h2>
          <ul className="space-y-2 text-gray-600">
            <li>• 访问 <a href="/admin/categories" className="text-blue-600 hover:text-blue-800">/admin/categories</a> 管理分类</li>
            <li>• 访问 <a href="/admin/upload" className="text-blue-600 hover:text-blue-800">/admin/upload</a> 上传音频时可选择分类</li>
            <li>• 分类数据存储在 data/categories.json 文件中</li>
            <li>• 支持自定义图标、颜色和描述</li>
          </ul>
        </div>
      </div>
    </div>
  );
}