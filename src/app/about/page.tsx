'use client';

import Link from 'next/link';
import { useAudioStore } from '../../store/audioStore';

export default function AboutPage() {
  const { currentAudio, isPlaying } = useAudioStore();
  
  return (
    <main className="min-h-screen bg-gray-50 py-4 sm:py-8">
      <div className="max-w-4xl mx-auto px-2 sm:px-4">
        <header className="text-center mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
            关于我们
          </h1>
          <p className="text-base sm:text-lg text-gray-600">
            了解医学生物科技音频博客平台
          </p>
        </header>
        
        <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">平台介绍</h2>
          <p className="text-gray-700 mb-4 text-sm sm:text-base leading-relaxed">
            医学生物科技音频博客是一个专注于医学领域的音频内容平台，旨在为医学专业人士、学生和对医学感兴趣的人提供高质量的音频内容。
          </p>
          <p className="text-gray-700 mb-4 text-sm sm:text-base leading-relaxed">
            我们的内容涵盖解剖学、生理学、病理学、药理学等多个医学学科，由专业医学人士录制和审核，确保内容的准确性和专业性。
          </p>
          
          <div className="mt-6 sm:mt-8">
            <Link href="/" className="text-blue-600 hover:text-blue-800 active:text-blue-900 touch-manipulation">
              返回首页
            </Link>
          </div>
        </div>
        
        {currentAudio && (
          <div className="bg-white rounded-lg shadow-lg p-3 sm:p-6 mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-semibold mb-3 sm:mb-4">当前播放状态</h2>
            <p className="text-gray-700 text-sm sm:text-base">
              当前正在{isPlaying ? '播放' : '暂停'}: <strong>{currentAudio.title}</strong>
            </p>
            <p className="text-gray-600 text-xs sm:text-sm mt-2 leading-relaxed">
              这个状态信息证明了全局状态管理正在工作，即使在不同页面间切换，音频播放状态也能保持。
            </p>
          </div>
        )}
      </div>
    </main>
  );
}