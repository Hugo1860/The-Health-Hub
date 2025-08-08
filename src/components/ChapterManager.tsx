'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface AudioChapter {
  id: string;
  audioId: string;
  title: string;
  description?: string;
  startTime: number;
  endTime?: number;
  order: number;
  createdAt: string;
  updatedAt: string;
}

interface ChapterManagerProps {
  audioId: string;
  onChaptersUpdate?: () => void;
}

export default function ChapterManager({ audioId, onChaptersUpdate }: ChapterManagerProps) {
  const { data: session } = useSession();
  const [chapters, setChapters] = useState<AudioChapter[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingChapter, setEditingChapter] = useState<AudioChapter | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    startTime: '',
    endTime: '',
    order: 1
  });

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchChapters();
    }
  }, [audioId, session]);

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
  };

  const parseTimeString = (timeStr: string): number => {
    const parts = timeStr.split(':').map(part => parseInt(part, 10));
    
    if (parts.length === 2) {
      // MM:SS format
      const [minutes, seconds] = parts;
      return minutes * 60 + seconds;
    } else if (parts.length === 3) {
      // HH:MM:SS format
      const [hours, minutes, seconds] = parts;
      return hours * 3600 + minutes * 60 + seconds;
    }
    
    throw new Error('Invalid time format. Use MM:SS or HH:MM:SS');
  };

  const fetchChapters = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/chapters?audioId=${audioId}`);
      if (response.ok) {
        const data = await response.json();
        setChapters(data);
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.startTime) return;

    try {
      const startTime = parseTimeString(formData.startTime);
      const endTime = formData.endTime ? parseTimeString(formData.endTime) : undefined;

      if (endTime !== undefined && endTime <= startTime) {
        alert('结束时间必须大于开始时间');
        return;
      }

      const requestData = {
        audioId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        startTime,
        endTime,
        order: formData.order
      };

      let response;
      if (editingChapter) {
        response = await fetch(`/api/chapters/${editingChapter.id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      } else {
        response = await fetch('/api/chapters', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestData),
        });
      }

      if (response.ok) {
        setFormData({
          title: '',
          description: '',
          startTime: '',
          endTime: '',
          order: chapters.length + 1
        });
        setShowAddForm(false);
        setEditingChapter(null);
        fetchChapters();
        onChaptersUpdate?.();
      } else {
        const error = await response.json();
        alert(error.error || '操作失败');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('操作失败');
    }
  };

  const handleEdit = (chapter: AudioChapter) => {
    setEditingChapter(chapter);
    setFormData({
      title: chapter.title,
      description: chapter.description || '',
      startTime: formatTime(chapter.startTime),
      endTime: chapter.endTime ? formatTime(chapter.endTime) : '',
      order: chapter.order
    });
    setShowAddForm(true);
  };

  const handleDelete = async (chapterId: string) => {
    if (!confirm('确定要删除这个章节吗？')) return;

    try {
      const response = await fetch(`/api/chapters/${chapterId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchChapters();
        onChaptersUpdate?.();
      } else {
        const error = await response.json();
        alert(error.error || '删除失败');
      }
    } catch (error) {
      console.error('Error deleting chapter:', error);
      alert('删除失败');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingChapter(null);
    setFormData({
      title: '',
      description: '',
      startTime: '',
      endTime: '',
      order: chapters.length + 1
    });
  };

  // 只有管理员可以看到此组件
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">章节管理</h3>
        <div className="animate-pulse space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="h-16 bg-gray-200 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">章节管理</h3>
        <button
          onClick={() => setShowAddForm(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          添加章节
        </button>
      </div>

      {/* 添加/编辑章节表单 */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">
            {editingChapter ? '编辑章节' : '添加章节'}
          </h4>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                章节标题 *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="输入章节标题..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                章节描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="输入章节描述..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  开始时间 * (MM:SS 或 HH:MM:SS)
                </label>
                <input
                  type="text"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  placeholder="0:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  结束时间 (可选)
                </label>
                <input
                  type="text"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  placeholder="5:00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  排序
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 1 })}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                {editingChapter ? '更新' : '添加'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 章节列表 */}
      <div className="space-y-3">
        {chapters.length === 0 ? (
          <p className="text-gray-500 text-center py-8">暂无章节</p>
        ) : (
          chapters.map((chapter, index) => (
            <div
              key={chapter.id}
              className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </span>
                  <h4 className="font-medium text-gray-900">{chapter.title}</h4>
                  <span className="text-sm text-gray-500 font-mono">
                    {formatTime(chapter.startTime)}
                    {chapter.endTime && ` - ${formatTime(chapter.endTime)}`}
                  </span>
                </div>
                {chapter.description && (
                  <p className="text-sm text-gray-600 ml-9">{chapter.description}</p>
                )}
              </div>

              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => handleEdit(chapter)}
                  className="px-3 py-1 text-sm text-blue-600 hover:text-blue-800 transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(chapter.id)}
                  className="px-3 py-1 text-sm text-red-600 hover:text-red-800 transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}