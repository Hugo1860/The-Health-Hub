'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

export interface TimeMarker {
  id: string;
  audioId: string;
  title: string;
  description?: string;
  type: 'highlight' | 'note';
  time: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

interface TimeMarkersProps {
  audioId: string;
  currentTime?: number;
  onMarkerClick?: (time: number) => void;
  onAddMarker?: (time: number) => void;
}

export default function TimeMarkers({ 
  audioId, 
  currentTime = 0, 
  onMarkerClick, 
  onAddMarker 
}: TimeMarkersProps) {
  const { data: session } = useSession();
  const [markers, setMarkers] = useState<TimeMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newMarker, setNewMarker] = useState<{
    title: string;
    description: string;
    type: 'highlight' | 'note';
    time: number;
  }>({
    title: '',
    description: '',
    type: 'highlight',
    time: currentTime
  });

  useEffect(() => {
    fetchMarkers();
  }, [audioId]);

  useEffect(() => {
    // 更新新标记的时间为当前播放时间
    setNewMarker(prev => ({ ...prev, time: currentTime }));
  }, [currentTime]);

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

  const fetchMarkers = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/markers?audioId=${audioId}`);
      if (response.ok) {
        const data = await response.json();
        setMarkers(data);
      }
    } catch (error) {
      console.error('Error fetching markers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMarker = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !newMarker.title.trim()) return;

    try {
      const response = await fetch('/api/markers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          audioId,
          title: newMarker.title.trim(),
          description: newMarker.description.trim(),
          type: newMarker.type,
          time: newMarker.time
        }),
      });

      if (response.ok) {
        setNewMarker({
          title: '',
          description: '',
          type: 'highlight',
          time: currentTime
        });
        setShowAddForm(false);
        fetchMarkers();
        
        if (onAddMarker) {
          onAddMarker(newMarker.time);
        }
      } else {
        const error = await response.json();
        alert(error.error || '添加标记失败');
      }
    } catch (error) {
      console.error('Error adding marker:', error);
      alert('添加标记失败');
    }
  };

  const handleDeleteMarker = async (markerId: string) => {
    if (!confirm('确定要删除这个标记吗？')) return;

    try {
      const response = await fetch(`/api/markers/${markerId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        fetchMarkers();
      } else {
        const error = await response.json();
        alert(error.error || '删除标记失败');
      }
    } catch (error) {
      console.error('Error deleting marker:', error);
      alert('删除标记失败');
    }
  };

  const getMarkerIcon = (type: string) => {
    switch (type) {
      case 'highlight':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        );
      case 'note':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        );
      default:
        return null;
    }
  };

  const getMarkerColor = (type: string) => {
    switch (type) {
      case 'highlight':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'note':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">时间标记</h3>
        <div className="space-y-3">
          {[...Array(3)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="flex items-center gap-3">
                <div className="bg-gray-200 h-4 w-16 rounded"></div>
                <div className="bg-gray-200 h-4 flex-1 rounded"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">时间标记</h3>
        {session?.user && (
          <button
            onClick={() => setShowAddForm(true)}
            className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
          >
            添加标记
          </button>
        )}
      </div>

      {/* 添加标记表单 */}
      {showAddForm && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-900 mb-3">添加时间标记</h4>
          <form onSubmit={handleAddMarker} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  标记类型
                </label>
                <select
                  value={newMarker.type}
                  onChange={(e) => setNewMarker({
                    ...newMarker,
                    type: e.target.value as 'highlight' | 'note'
                  })}
                  className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="highlight">重点</option>
                  <option value="note">笔记</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  时间位置
                </label>
                <input
                  type="text"
                  value={formatTime(newMarker.time)}
                  readOnly
                  className="w-full px-2 py-1 text-sm bg-gray-100 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                标记标题 *
              </label>
              <input
                type="text"
                value={newMarker.title}
                onChange={(e) => setNewMarker({ ...newMarker, title: e.target.value })}
                placeholder="输入标记标题..."
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                描述
              </label>
              <textarea
                value={newMarker.description}
                onChange={(e) => setNewMarker({ ...newMarker, description: e.target.value })}
                placeholder="输入标记描述..."
                rows={2}
                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="px-3 py-1 text-sm border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                添加
              </button>
            </div>
          </form>
        </div>
      )}

      {/* 标记列表 */}
      <div className="space-y-2">
        {markers.length === 0 ? (
          <p className="text-gray-500 text-center py-4 text-sm">暂无时间标记</p>
        ) : (
          markers.map((marker) => (
            <div
              key={marker.id}
              className={`group cursor-pointer rounded-lg p-3 border transition-colors hover:shadow-sm ${getMarkerColor(marker.type)}`}
              onClick={() => onMarkerClick?.(marker.time)}
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  {getMarkerIcon(marker.type)}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-sm font-medium truncate">
                      {marker.title}
                    </h4>
                    <span className="text-xs font-mono ml-2">
                      {formatTime(marker.time)}
                    </span>
                  </div>
                  
                  {marker.description && (
                    <p className="text-xs opacity-75 line-clamp-2">
                      {marker.description}
                    </p>
                  )}
                </div>
                
                {session?.user && (
                  marker.createdBy === session.user.id || session.user.role === 'admin'
                ) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteMarker(marker.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-red-600 hover:text-red-800 text-xs transition-opacity"
                  >
                    删除
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}