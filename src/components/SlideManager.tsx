'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { Slide } from '@/lib/slides';
import Image from 'next/image';

interface SlideManagerProps {
  audioId: string;
}

export default function SlideManager({ audioId }: SlideManagerProps) {
  const { data: session } = useSession();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSlide, setEditingSlide] = useState<Slide | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    description: '',
    imageFile: null as File | null,
    imageUrl: '',
  });

  useEffect(() => {
    if (session?.user?.role === 'admin') {
      fetchSlides();
    }
  }, [audioId, session]);

  const fetchSlides = async () => {
    try {
      const response = await fetch(`/api/slides?audioId=${audioId}`);
      if (response.ok) {
        const data = await response.json();
        setSlides(data);
      }
    } catch (error) {
      console.error('Error fetching slides:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, imageFile: file });
    }
  };

  const uploadImage = async (file: File): Promise<string> => {
    const uploadFormData = new FormData();
    uploadFormData.append('file', file);

    const response = await fetch('/api/slides/upload', {
      method: 'POST',
      body: uploadFormData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Upload failed');
    }

    const data = await response.json();
    return data.url;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);

    try {
      let imageUrl = formData.imageUrl;

      // 如果有新上传的文件，先上传图片
      if (formData.imageFile) {
        imageUrl = await uploadImage(formData.imageFile);
      }

      const slideData = {
        audioId,
        title: formData.title,
        imageUrl,
        startTime: parseFloat(formData.startTime),
        endTime: formData.endTime ? parseFloat(formData.endTime) : undefined,
        description: formData.description,
        order: slides.length,
      };

      const url = editingSlide ? `/api/slides/${editingSlide.id}` : '/api/slides';
      const method = editingSlide ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slideData),
      });

      if (response.ok) {
        const newSlide = await response.json();
        if (editingSlide) {
          setSlides(slides.map(s => s.id === editingSlide.id ? newSlide : s));
        } else {
          setSlides([...slides, newSlide]);
        }
        resetForm();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save slide');
      }
    } catch (error) {
      console.error('Error saving slide:', error);
      alert('Failed to save slide');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (slide: Slide) => {
    setEditingSlide(slide);
    setFormData({
      title: slide.title,
      startTime: slide.startTime.toString(),
      endTime: slide.endTime?.toString() || '',
      description: slide.description || '',
      imageFile: null,
      imageUrl: slide.imageUrl,
    });
    setShowAddForm(true);
  };

  const handleDelete = async (slideId: string) => {
    if (!confirm('确定要删除这张幻灯片吗？')) {
      return;
    }

    try {
      const response = await fetch(`/api/slides/${slideId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setSlides(slides.filter(s => s.id !== slideId));
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete slide');
      }
    } catch (error) {
      console.error('Error deleting slide:', error);
      alert('Failed to delete slide');
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      startTime: '',
      endTime: '',
      description: '',
      imageFile: null,
      imageUrl: '',
    });
    setEditingSlide(null);
    setShowAddForm(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // 只有管理员可以看到这个组件
  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <h3 className="text-lg font-semibold mb-4">幻灯片管理</h3>
        <div className="text-gray-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">幻灯片管理</h3>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
        >
          {showAddForm ? '取消' : '添加幻灯片'}
        </button>
      </div>

      {showAddForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-gray-50 rounded-lg">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                标题 *
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
                开始时间 (秒) *
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                结束时间 (秒，可选)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                幻灯片图片 *
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required={!editingSlide}
              />
            </div>
          </div>
          
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              描述 (可选)
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
              disabled={uploading}
              className="bg-green-500 text-white px-4 py-2 rounded-md hover:bg-green-600 transition-colors disabled:opacity-50"
            >
              {uploading ? '保存中...' : (editingSlide ? '更新' : '添加')}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
          </div>
        </form>
      )}

      {slides.length === 0 ? (
        <div className="text-gray-500 text-center py-8">
          暂无幻灯片，点击上方按钮添加第一张幻灯片
        </div>
      ) : (
        <div className="space-y-4">
          {slides
            .sort((a, b) => a.startTime - b.startTime)
            .map((slide, index) => (
              <div
                key={slide.id}
                className="flex items-start gap-4 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <div className="flex-shrink-0">
                  <Image
                    src={slide.imageUrl}
                    alt={slide.title}
                    width={120}
                    height={90}
                    className="w-30 h-20 object-cover rounded"
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-gray-900 mb-1">
                    {index + 1}. {slide.title}
                  </h4>
                  {slide.description && (
                    <p className="text-gray-600 text-sm mb-2">{slide.description}</p>
                  )}
                  <div className="text-xs text-gray-500">
                    时间: {formatTime(slide.startTime)}
                    {slide.endTime && ` - ${formatTime(slide.endTime)}`}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    创建时间: {new Date(slide.createdAt).toLocaleString('zh-CN')}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(slide)}
                    className="text-blue-600 hover:text-blue-800 text-sm"
                  >
                    编辑
                  </button>
                  <button
                    onClick={() => handleDelete(slide.id)}
                    className="text-red-600 hover:text-red-800 text-sm"
                  >
                    删除
                  </button>
                </div>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}