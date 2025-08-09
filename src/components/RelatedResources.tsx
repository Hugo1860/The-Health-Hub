'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { RelatedResource } from '@/lib/related-resources';

interface RelatedResourcesProps {
  audioId: string;
}

export default function RelatedResources({ audioId }: RelatedResourcesProps) {
  const { data: session } = useSession();
  const [resources, setResources] = useState<RelatedResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    url: '',
    type: 'link' as RelatedResource['type'],
    description: '',
  });

  useEffect(() => {
    fetchResources();
  }, [audioId]);

  const fetchResources = async () => {
    try {
      const response = await fetch(`/api/related-resources?audioId=${audioId}`);
      if (response.ok) {
        const data = await response.json();
        setResources(data);
      }
    } catch (error) {
      console.error('Error fetching related resources:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/related-resources', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioId,
          ...formData,
        }),
      });

      if (response.ok) {
        const newResource = await response.json();
        setResources([...resources, newResource]);
        setFormData({ title: '', url: '', type: 'link', description: '' });
        setShowAddForm(false);
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to add resource');
      }
    } catch (error) {
      console.error('Error adding resource:', error);
      alert('Failed to add resource');
    }
  };

  const handleDelete = async (resourceId: string) => {
    if (!confirm('确定要删除这个相关资源吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/related-resources/${resourceId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setResources(resources.filter(r => r.id !== resourceId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete resource');
      }
    } catch (error) {
      console.error('Error deleting resource:', error);
      alert('Failed to delete resource');
    }
  };

  const getResourceIcon = (type: RelatedResource['type']) => {
    switch (type) {
      case 'link':
        return '🔗';
      case 'pdf':
        return '📄';
      case 'image':
        return '🖼️';

      default:
        return '📎';
    }
  };

  const getResourceTypeLabel = (type: RelatedResource['type']) => {
    switch (type) {
      case 'link':
        return '链接';
      case 'pdf':
        return 'PDF文档';
      case 'image':
        return '图片';
      default:
        return '其他';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">相关资源</h3>
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">相关资源</h3>
        {session?.user?.role === 'admin' && (
          <button
            onClick={() => setShowAddForm(!showAddForm)}
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          >
            {showAddForm ? '取消' : '添加资源'}
          </button>
        )}
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                类型
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as RelatedResource['type'] })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="link">链接</option>
                <option value="pdf">PDF文档</option>
                <option value="image">图片</option>

              </select>
            </div>
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              URL
            </label>
            <input
              type="url"
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描述（可选）
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={3}
            />
          </div>
          <div className="mt-4 flex gap-2">
            <button
              type="submit"
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors"
            >
              添加
            </button>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {resources.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          暂无相关资源
        </div>
      ) : (
        <div className="space-y-3">
          {resources.map((resource) => (
            <div
              key={resource.id}
              className="flex items-start justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{getResourceIcon(resource.type)}</span>
                  <a
                    href={resource.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    {resource.title}
                  </a>
                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                    {getResourceTypeLabel(resource.type)}
                  </span>
                </div>
                {resource.description && (
                  <p className="text-gray-600 text-sm mb-2">{resource.description}</p>
                )}
                <div className="text-xs text-gray-400">
                  添加时间: {new Date(resource.createdAt).toLocaleString('zh-CN')}
                </div>
              </div>
              {session?.user?.role === 'admin' && (
                <button
                  onClick={() => handleDelete(resource.id)}
                  className="text-red-500 hover:text-red-700 ml-4"
                  title="删除资源"
                >
                  🗑️
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}