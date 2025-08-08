'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import AntdAdminLayout from '../../../components/AntdAdminLayout';
import { Slide } from '@/lib/slides';
import Image from 'next/image';

interface AudioFile {
  id: string;
  title: string;
  subject: string;
}

export default function SlidesManagementPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [audios, setAudios] = useState<AudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAudio, setSelectedAudio] = useState<string>('');

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user || session.user.role !== 'admin') {
      router.push('/');
      return;
    }

    fetchData();
  }, [session, status, router]);

  const fetchData = async () => {
    try {
      // 获取幻灯片
      const slidesResponse = await fetch('/api/slides');
      if (slidesResponse.ok) {
        const slidesData = await slidesResponse.json();
        setSlides(slidesData);
      }

      // 获取音频列表
      const audiosResponse = await fetch('/api/audio');
      if (audiosResponse.ok) {
        const audiosData = await audiosResponse.json();
        setAudios(audiosData);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
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

  const getAudioTitle = (audioId: string) => {
    const audio = audios.find(a => a.id === audioId);
    return audio ? audio.title : `音频 ${audioId}`;
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const filteredSlides = selectedAudio
    ? slides.filter(s => s.audioId === selectedAudio)
    : slides;

  // 按音频分组幻灯片
  const slidesByAudio = filteredSlides.reduce((acc, slide) => {
    if (!acc[slide.audioId]) {
      acc[slide.audioId] = [];
    }
    acc[slide.audioId].push(slide);
    return acc;
  }, {} as Record<string, Slide[]>);

  // 对每个音频的幻灯片按时间排序
  Object.keys(slidesByAudio).forEach(audioId => {
    slidesByAudio[audioId].sort((a, b) => a.startTime - b.startTime);
  });

  if (status === 'loading' || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (!session?.user || session.user.role !== 'admin') {
    return null;
  }

  return (
    <AntdAdminLayout>
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">幻灯片管理</h1>
          <p className="text-gray-600">管理所有音频的幻灯片</p>
        </div>

        {/* 筛选器 */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                按音频筛选
              </label>
              <select
                value={selectedAudio}
                onChange={(e) => setSelectedAudio(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">所有音频</option>
                {audios.map((audio) => (
                  <option key={audio.id} value={audio.id}>
                    {audio.title} ({audio.subject})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <div className="text-sm text-gray-600">
                共 {filteredSlides.length} 张幻灯片
              </div>
            </div>
          </div>
        </div>

        {/* 幻灯片列表 */}
        <div className="space-y-6">
          {Object.keys(slidesByAudio).length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 text-center text-gray-500">
              {selectedAudio ? '该音频暂无幻灯片' : '暂无幻灯片'}
            </div>
          ) : (
            Object.entries(slidesByAudio).map(([audioId, audioSlides]) => (
              <div key={audioId} className="bg-white rounded-xl shadow-sm border border-gray-100">
                <div className="p-6 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {getAudioTitle(audioId)}
                      </h2>
                      <p className="text-sm text-gray-600 mt-1">
                        {audioSlides.length} 张幻灯片
                      </p>
                    </div>
                    <button
                      onClick={() => router.push(`/audio/${audioId}`)}
                      className="text-blue-600 hover:text-blue-800 text-sm underline"
                    >
                      查看音频页面
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {audioSlides.map((slide, index) => (
                      <div
                        key={slide.id}
                        className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                      >
                        <div className="relative">
                          <Image
                            src={slide.imageUrl}
                            alt={slide.title}
                            width={300}
                            height={200}
                            className="w-full h-40 object-cover"
                          />
                          <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            #{index + 1}
                          </div>
                          <div className="absolute top-2 right-2 bg-black/70 text-white text-xs px-2 py-1 rounded">
                            {formatTime(slide.startTime)}
                          </div>
                        </div>

                        <div className="p-4">
                          <h3 className="font-medium text-gray-900 mb-2 line-clamp-2">
                            {slide.title}
                          </h3>
                          {slide.description && (
                            <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                              {slide.description}
                            </p>
                          )}

                          <div className="flex items-center justify-between text-xs text-gray-500 mb-3">
                            <span>
                              时间: {formatTime(slide.startTime)}
                              {slide.endTime && ` - ${formatTime(slide.endTime)}`}
                            </span>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={() => router.push(`/audio/${audioId}?t=${slide.startTime}`)}
                              className="flex-1 text-blue-600 hover:text-blue-800 px-3 py-1 text-sm border border-blue-300 rounded hover:bg-blue-50"
                            >
                              跳转播放
                            </button>
                            <button
                              onClick={() => handleDelete(slide.id)}
                              className="text-red-600 hover:text-red-800 px-3 py-1 text-sm border border-red-300 rounded hover:bg-red-50"
                            >
                              删除
                            </button>
                          </div>

                          <div className="text-xs text-gray-400 mt-2">
                            创建时间: {new Date(slide.createdAt).toLocaleString('zh-CN')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </AntdAdminLayout>
  );
}