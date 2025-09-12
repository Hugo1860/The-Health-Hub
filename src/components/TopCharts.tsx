'use client';

import { useState, useEffect } from 'react';
import { AudioFile } from '../store/audioStore';

interface TopChartsProps {
  charts?: AudioFile[];
  timeRange?: 'day' | 'week' | 'month';
  onTimeRangeChange?: (range: 'day' | 'week' | 'month') => void;
  onAudioSelect?: (audio: AudioFile) => void;
  maxItems?: number;
  autoFetch?: boolean;
}

export default function TopCharts({ 
  charts = [], 
  timeRange = 'week',
  onTimeRangeChange,
  onAudioSelect,
  maxItems = 10,
  autoFetch = false
}: TopChartsProps) {
  const [selectedRange, setSelectedRange] = useState<'day' | 'week' | 'month'>(timeRange);
  const [localCharts, setLocalCharts] = useState<AudioFile[]>(charts);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (autoFetch) {
      fetchCharts(selectedRange);
    }
  }, [autoFetch, selectedRange]);

  useEffect(() => {
    setLocalCharts(charts);
  }, [charts]);

  const fetchCharts = async (range: 'day' | 'week' | 'month') => {
    setLoading(true);
    try {
      const response = await fetch(`/api/audio/charts?range=${range}&limit=${maxItems}`);
      if (response.ok) {
        const data = await response.json();
        setLocalCharts(data);
      }
    } catch (error) {
      console.error('获取排行榜数据失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRangeChange = async (range: 'day' | 'week' | 'month') => {
    setSelectedRange(range);
    onTimeRangeChange?.(range);
    
    if (autoFetch) {
      await fetchCharts(range);
    }
  };

  const handleAudioClick = (audio: AudioFile) => {
    onAudioSelect?.(audio);
  };

  const getRangeLabel = (range: 'day' | 'week' | 'month') => {
    switch (range) {
      case 'day': return '今日';
      case 'week': return '本周';
      case 'month': return '本月';
      default: return '本周';
    }
  };

  const getRankIcon = (index: number) => {
    switch (index) {
      case 0: return '🥇';
      case 1: return '🥈';
      case 2: return '🥉';
      default: return `${index + 1}`;
    }
  };

  const displayedCharts = localCharts.slice(0, maxItems);

  return (
    <div className="space-y-4">
      {/* 时间范围选择器 */}
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">排行榜</h3>
        <div className="flex bg-gray-100 rounded-lg p-1">
          {(['day', 'week', 'month'] as const).map((range) => (
            <button
              key={range}
              onClick={() => handleRangeChange(range)}
              className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                selectedRange === range
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {getRangeLabel(range)}
            </button>
          ))}
        </div>
      </div>

      {/* 排行榜列表 */}
      <div className="space-y-2">
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center space-x-3 p-2 rounded-lg">
                <div className="w-6 h-6 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="w-8 h-8 bg-gray-200 rounded animate-pulse"></div>
                <div className="flex-1 space-y-1">
                  <div className="h-3 bg-gray-200 rounded animate-pulse"></div>
                  <div className="h-2 bg-gray-200 rounded animate-pulse w-2/3"></div>
                </div>
              </div>
            ))}
          </div>
        ) : displayedCharts.length === 0 ? (
          <div className="text-center py-6">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-2">
              <span className="text-gray-400 text-xs">📊</span>
            </div>
            <p className="text-sm text-gray-500">暂无排行数据</p>
          </div>
        ) : (
          displayedCharts.map((audio, index) => (
            <div
              key={audio.id}
              onClick={() => handleAudioClick(audio)}
              className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-all group ${
                index < 3 
                  ? 'bg-gradient-to-r from-yellow-50 to-orange-50 hover:from-yellow-100 hover:to-orange-100' 
                  : 'hover:bg-gray-100'
              }`}
            >
              {/* 排名 */}
              <div className={`flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                index < 3 
                  ? 'bg-gradient-to-r from-yellow-400 to-orange-500 text-white' 
                  : 'bg-gray-200 text-gray-600'
              }`}>
                {typeof getRankIcon(index) === 'string' && getRankIcon(index).length > 1 
                  ? getRankIcon(index) 
                  : index + 1
                }
              </div>

              {/* 音频封面 */}
              <div className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 ${
                index < 3
                  ? 'bg-gradient-to-br from-yellow-400 to-orange-500'
                  : 'bg-gradient-to-br from-blue-400 to-purple-500'
              }`}>
                <span className="text-white text-xs">
                  {index < 3 ? '🏆' : '🎵'}
                </span>
              </div>

              {/* 音频信息 */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate group-hover:text-blue-600 transition-colors">
                  {audio.title}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="truncate">{audio.subject || '未分类'}</span>
                  {audio.duration && (
                    <>
                      <span>•</span>
                      <span>{audio.duration}</span>
                    </>
                  )}
                </div>
              </div>

              {/* 趋势指示器 */}
              <div className="flex flex-col items-center">
                {index < 3 && (
                  <div className="text-xs text-green-600 font-medium">
                    ↗️
                  </div>
                )}
                <div className="text-xs text-gray-400">
                  {new Date(audio.uploadDate).toLocaleDateString('zh-CN', { 
                    month: 'short', 
                    day: 'numeric' 
                  })}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* 查看更多 */}
      {localCharts.length > maxItems && (
        <div className="pt-2 border-t border-gray-200">
          <button className="w-full text-center text-sm text-blue-600 hover:text-blue-800 font-medium py-2 hover:bg-blue-50 rounded-lg transition-colors">
            查看完整排行榜 →
          </button>
        </div>
      )}

      {/* 统计信息 */}
      <div className="pt-2 border-t border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="flex justify-between">
            <span>统计周期</span>
            <span className="font-medium">{getRangeLabel(selectedRange)}</span>
          </div>
          <div className="flex justify-between">
            <span>上榜音频</span>
            <span className="font-medium">{displayedCharts.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}