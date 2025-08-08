'use client';

import { useState } from 'react';
import { FeaturedPlayer } from '../../components/FeaturedPlayer';
import { AudioPlayer } from '../../components/AudioPlayer';
import { useAudioStore } from '../../store/audioStore';

// 测试音频数据
const testAudio = {
  id: "test-1",
  title: "测试音频播放器",
  description: "这是一个测试音频，用于验证播放器功能",
  url: "/uploads/1753625335077-卫生临床护理规范标准发布.wav",
  filename: "test-audio.wav",
  uploadDate: "2025-01-27T10:00:00.000Z",
  subject: "测试",
  tags: ["测试", "播放器"],
  coverImage: "/images/test-cover.jpg" // 可选的封面图片
};

export default function TestPlayerPage() {
  const { setCurrentAudio, currentAudio } = useAudioStore();

  const handlePlayAudio = () => {
    setCurrentAudio(testAudio);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">音频播放器测试页面</h1>
        
        {/* 布局说明 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-8">
          <h2 className="text-lg font-semibold text-blue-900 mb-2">🎨 完整中文按钮设计</h2>
          <p className="text-blue-800 text-sm">
            所有按钮都使用中文汉字显示。主播放控制居中（后退、播放/暂停、前进），右侧是辅助功能（音量、收藏），右上角保留变速控制。界面直观易懂，功能完整。
          </p>
        </div>
        
        {/* 测试按钮 */}
        <div className="mb-8">
          <button
            onClick={handlePlayAudio}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            加载测试音频
          </button>
        </div>

        {/* 播放器组件 */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">主播放器 - 新布局</h2>
          <div className="bg-gray-100 p-6 rounded-xl">
            <FeaturedPlayer currentAudio={currentAudio} showFullControls={true} />
          </div>
        </div>

        {/* 功能说明 */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">完整中文按钮布局</h3>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-gray-800 mb-2">按钮布局</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 中央：主播放控制（后退、播放/暂停、前进）</li>
                <li>• 右下：辅助功能（音量、收藏）</li>
                <li>• 右上：变速控制</li>
                <li>• 所有按钮都使用中文汉字</li>
                <li>• 音量按钮有垂直滑块</li>
                <li>• 收藏按钮有状态变化</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium text-gray-800 mb-2">功能测试</h4>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• 播放控制：播放/暂停、前进/后退</li>
                <li>• 音量控制：点击"音量"调节音量</li>
                <li>• 收藏功能：点击"收藏"切换收藏状态</li>
                <li>• 变速播放：点击"变速"选择速度</li>
                <li>• 进度条：点击跳转到指定位置</li>
                <li>• 封面/标题：点击跳转详情页</li>
              </ul>
            </div>
          </div>
        </div>

        {/* 当前状态显示 */}
        {currentAudio && (
          <div className="mt-8 bg-white rounded-lg p-6 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">当前播放状态</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium">音频ID:</span> {currentAudio.id}
              </div>
              <div>
                <span className="font-medium">标题:</span> {currentAudio.title}
              </div>
              <div>
                <span className="font-medium">文件名:</span> {currentAudio.filename}
              </div>
              <div>
                <span className="font-medium">分类:</span> {currentAudio.subject}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 隐藏的音频播放器 */}
      <AudioPlayer />
    </div>
  );
}