'use client';

import { useState } from 'react';
import { usePerformanceWarnings } from '@/hooks/usePerformanceMonitor';
import { useAudioStore } from '@/store/audioStore';
import { audioCacheManager } from '@/lib/audioCache';

interface PerformancePanelProps {
  className?: string;
}

export default function PerformancePanel({ className = '' }: PerformancePanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const { metrics, warnings, hasWarnings } = usePerformanceWarnings();
  const { clearCache, networkQuality, preloadEnabled, setPreloadEnabled } = useAudioStore();

  const handleClearCache = () => {
    clearCache();
    alert('缓存已清除');
  };

  const cacheStats = audioCacheManager.getCacheStats();

  if (process.env.NODE_ENV !== 'development') {
    return null; // 只在开发环境显示
  }

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${className}`}>
      {/* 性能警告指示器 */}
      {hasWarnings && !isOpen && (
        <div className="mb-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm animate-pulse">
          性能警告 ({warnings.length})
        </div>
      )}

      {/* 切换按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-12 h-12 rounded-full shadow-lg flex items-center justify-center transition-colors ${
          hasWarnings 
            ? 'bg-red-500 hover:bg-red-600 text-white' 
            : 'bg-blue-500 hover:bg-blue-600 text-white'
        }`}
        title="性能监控面板"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      </button>

      {/* 性能面板 */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-80 bg-white rounded-lg shadow-xl border border-gray-200 p-4 max-h-96 overflow-y-auto">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900">性能监控</h3>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* 性能警告 */}
          {warnings.length > 0 && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <h4 className="text-sm font-medium text-red-800 mb-2">性能警告</h4>
              <ul className="text-xs text-red-700 space-y-1">
                {warnings.map((warning, index) => (
                  <li key={index}>• {warning}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 性能指标 */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600">FPS</div>
                <div className={`text-lg font-semibold ${
                  metrics.fps < 30 ? 'text-red-600' : 
                  metrics.fps < 50 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.fps || 0}
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600">内存 (MB)</div>
                <div className={`text-lg font-semibold ${
                  metrics.memoryUsage > 100 ? 'text-red-600' : 
                  metrics.memoryUsage > 50 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.memoryUsage || 0}
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600">渲染时间 (ms)</div>
                <div className={`text-lg font-semibold ${
                  metrics.renderTime > 16 ? 'text-red-600' : 
                  metrics.renderTime > 10 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.renderTime?.toFixed(1) || 0}
                </div>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600">网速 (Mbps)</div>
                <div className={`text-lg font-semibold ${
                  metrics.networkSpeed < 1 ? 'text-red-600' : 
                  metrics.networkSpeed < 5 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {metrics.networkSpeed?.toFixed(1) || 0}
                </div>
              </div>
            </div>

            {/* 缓存信息 */}
            <div className="bg-blue-50 p-3 rounded-lg">
              <h4 className="text-sm font-medium text-blue-800 mb-2">音频缓存</h4>
              <div className="text-xs text-blue-700 space-y-1">
                <div>缓存大小: {(cacheStats.size / 1024 / 1024).toFixed(1)} MB</div>
                <div>缓存项目: {cacheStats.count}</div>
                <div>网络质量: {networkQuality}</div>
              </div>
            </div>

            {/* 控制选项 */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">预加载</span>
                <button
                  onClick={() => setPreloadEnabled(!preloadEnabled)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preloadEnabled ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preloadEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
              
              <button
                onClick={handleClearCache}
                className="w-full bg-red-500 text-white px-3 py-2 rounded-md text-sm hover:bg-red-600 transition-colors"
              >
                清除缓存
              </button>
            </div>

            {/* 页面加载时间 */}
            {metrics.loadTime > 0 && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <div className="text-xs text-gray-600">页面加载时间</div>
                <div className={`text-sm font-medium ${
                  metrics.loadTime > 3000 ? 'text-red-600' : 
                  metrics.loadTime > 1000 ? 'text-yellow-600' : 'text-green-600'
                }`}>
                  {(metrics.loadTime / 1000).toFixed(2)}s
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}