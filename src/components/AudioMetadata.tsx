'use client';

import { AudioFile } from '@/store/audioStore';

interface AudioMetadataProps {
  audio: AudioFile;
}

export default function AudioMetadata({ audio }: AudioMetadataProps) {
  const formatFileSize = (url: string) => {
    // 这里可以通过API获取文件大小，暂时返回占位符
    return '未知';
  };

  const formatDuration = (duration?: number) => {
    if (!duration) return '未知';
    
    const hours = Math.floor(duration / 3600);
    const minutes = Math.floor((duration % 3600) / 60);
    const seconds = Math.floor(duration % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  const metadataItems = [
    {
      label: '上传时间',
      value: new Date(audio.uploadDate).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      )
    },
    {
      label: '学科分类',
      value: audio.subject,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      )
    }
  ];

  // 添加演讲者信息（如果有）
  if (audio.speaker) {
    metadataItems.push({
      label: '演讲者',
      value: audio.speaker,
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      )
    });
  }

  // 添加录制日期（如果有）
  if (audio.recordingDate) {
    metadataItems.push({
      label: '录制日期',
      value: new Date(audio.recordingDate).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
        </svg>
      )
    });
  }

  // 添加时长（如果有）
  if (audio.duration) {
    metadataItems.push({
      label: '时长',
      value: formatDuration(audio.duration),
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    });
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-900 mb-3">音频信息</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {metadataItems.map((item, index) => (
          <div key={index} className="flex items-center gap-2 text-sm">
            <div className="flex-shrink-0 text-gray-500">
              {item.icon}
            </div>
            <div className="flex-1">
              <span className="text-gray-600">{item.label}:</span>
              <span className="ml-1 text-gray-900 font-medium">{item.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* 标签 */}
      {audio.tags && audio.tags.length > 0 && (
        <div className="mt-4 pt-3 border-t border-gray-200">
          <div className="flex items-center gap-2 text-sm mb-2">
            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
            <span className="text-gray-600">标签:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {audio.tags.map((tag, index) => (
              <span
                key={index}
                className="inline-block bg-gray-200 text-gray-700 text-xs px-2 py-1 rounded-full"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}