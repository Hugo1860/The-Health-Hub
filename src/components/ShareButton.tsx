'use client'

import { useState, useEffect } from 'react'
import { AudioFile } from '@/store/audioStore'
import ShareCardModal from './ShareCardModal'
import MobileShareCardModal from './MobileShareCardModal'

interface ShareButtonProps {
  audioId: string
  audioTitle: string
  audioDescription?: string
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
  // 新增：完整的音频数据，用于生成分享卡片
  audioData?: AudioFile
}

interface ShareOption {
  name: string
  icon: string
  color: string
  url: (title: string, url: string, description?: string) => string
}

export default function ShareButton({
  audioId,
  audioTitle,
  audioDescription = '',
  size = 'md',
  showText = true,
  audioData
}: ShareButtonProps) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showShareCardModal, setShowShareCardModal] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6'
  }

  const buttonSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2 text-base'
  }

  // 获取当前页面URL
  const getShareUrl = () => {
    if (typeof window !== 'undefined') {
      return `${window.location.origin}/audio/${audioId}`
    }
    return `https://your-domain.com/audio/${audioId}`
  }

  const shareUrl = getShareUrl()
  const shareText = `${audioTitle} - 医学生物科技音频博客`
  const shareDescription = audioDescription || `收听这个精彩的医学音频内容：${audioTitle}`

  const shareOptions: ShareOption[] = [
    {
      name: '微信',
      icon: '💬',
      color: 'bg-green-500 hover:bg-green-600',
      url: (title, url) => `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`
    },
    {
      name: '微博',
      icon: '🐦',
      color: 'bg-red-500 hover:bg-red-600',
      url: (title, url, desc) => `https://service.weibo.com/share/share.php?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&content=${encodeURIComponent(desc || '')}`
    },
    {
      name: 'QQ',
      icon: '🐧',
      color: 'bg-blue-500 hover:bg-blue-600',
      url: (title, url, desc) => `https://connect.qq.com/widget/shareqq/index.html?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&desc=${encodeURIComponent(desc || '')}`
    },
    {
      name: 'Twitter',
      icon: '🐦',
      color: 'bg-sky-500 hover:bg-sky-600',
      url: (title, url) => `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`
    },
    {
      name: 'Facebook',
      icon: '📘',
      color: 'bg-blue-600 hover:bg-blue-700',
      url: (title, url) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}&quote=${encodeURIComponent(title)}`
    },
    {
      name: 'LinkedIn',
      icon: '💼',
      color: 'bg-blue-700 hover:bg-blue-800',
      url: (title, url, desc) => `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}&summary=${encodeURIComponent(desc || '')}`
    }
  ]

  const handleShare = async (option: ShareOption) => {
    if (option.name === '微信') {
      // 微信分享显示二维码
      const qrUrl = option.url(shareText, shareUrl, shareDescription)
      window.open(qrUrl, '_blank', 'width=300,height=300')
    } else {
      // 其他平台直接打开分享链接
      const url = option.url(shareText, shareUrl, shareDescription)
      window.open(url, '_blank', 'width=600,height=400')
    }
    setShowDropdown(false)
  }

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      // 降级方案
      const textArea = document.createElement('textarea')
      textArea.value = shareUrl
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand('copy')
      document.body.removeChild(textArea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
    setShowDropdown(false)
  }

  const handleNativeShare = async () => {
    if (typeof navigator !== 'undefined' && 'share' in navigator) {
      try {
        await (navigator as any).share({
          title: shareText,
          text: shareDescription,
          url: shareUrl
        })
        setShowDropdown(false)
      } catch (error) {
        // 用户取消分享或不支持
        console.log('分享取消或失败')
      }
    }
  }

  const handleGenerateShareCard = () => {
    setShowDropdown(false)
    setShowShareCardModal(true)
  }

  // 检测移动设备
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent.toLowerCase());
      const isSmallScreen = window.innerWidth < 768;
      setIsMobile(isMobileDevice || isSmallScreen);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // 创建默认的音频数据（如果没有提供完整数据）
  const getAudioDataForCard = (): AudioFile => {
    if (audioData) {
      return audioData
    }
    
    // 创建基本的音频数据结构
    return {
      id: audioId,
      title: audioTitle,
      description: audioDescription,
      url: shareUrl,
      filename: '',
      uploadDate: new Date().toISOString()
    }
  }

  return (
    <div className="relative">
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`
          ${buttonSizeClasses[size]}
          bg-gray-200 text-gray-700 hover:bg-gray-300 active:bg-gray-400
          rounded transition-colors touch-manipulation
          flex items-center gap-2
        `}
        title="分享音频"
      >
        <svg
          className={sizeClasses[size]}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z"
          />
        </svg>
        
        {showText && <span>分享</span>}
      </button>

      {showDropdown && (
        <>
          {/* 点击外部关闭下拉菜单 */}
          <div
            className="fixed inset-0 z-10"
            onClick={() => setShowDropdown(false)}
          ></div>
          
          <div className="absolute right-0 mt-2 w-64 bg-white rounded-md shadow-lg py-2 z-20 border border-gray-200">
            <div className="px-4 py-2 text-sm font-medium text-gray-900 border-b border-gray-100">
              分享到
            </div>
            
            {/* 生成分享卡片 */}
            <button
              onClick={handleGenerateShareCard}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 touch-manipulation flex items-center gap-3"
            >
              <span className="text-lg">🎨</span>
              <span>生成分享卡片</span>
            </button>

            {/* 原生分享API（如果支持） */}
            {typeof navigator !== 'undefined' && 'share' in navigator && (
              <button
                onClick={handleNativeShare}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 touch-manipulation flex items-center gap-3"
              >
                <span className="text-lg">📱</span>
                <span>系统分享</span>
              </button>
            )}
            
            {/* 复制链接 */}
            <button
              onClick={handleCopyLink}
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 active:bg-gray-200 touch-manipulation flex items-center gap-3"
            >
              <span className="text-lg">🔗</span>
              <span>{copied ? '已复制!' : '复制链接'}</span>
            </button>
            
            <div className="border-t border-gray-100 my-2"></div>
            
            {/* 社交平台分享 */}
            <div className="grid grid-cols-2 gap-1 px-2">
              {shareOptions.map((option) => (
                <button
                  key={option.name}
                  onClick={() => handleShare(option)}
                  className={`
                    ${option.color} text-white
                    px-3 py-2 rounded text-sm
                    hover:opacity-90 active:opacity-80
                    touch-manipulation
                    flex items-center justify-center gap-2
                  `}
                >
                  <span>{option.icon}</span>
                  <span>{option.name}</span>
                </button>
              ))}
            </div>
            
            <div className="px-4 py-2 mt-2 border-t border-gray-100">
              <p className="text-xs text-gray-500 truncate" title={shareUrl}>
                {shareUrl}
              </p>
            </div>
          </div>
        </>
      )}

      {/* 分享卡片模态框 - 根据设备类型选择 */}
      {isMobile ? (
        <MobileShareCardModal
          isOpen={showShareCardModal}
          audio={getAudioDataForCard()}
          onClose={() => setShowShareCardModal(false)}
        />
      ) : (
        <ShareCardModal
          isOpen={showShareCardModal}
          audio={getAudioDataForCard()}
          onClose={() => setShowShareCardModal(false)}
        />
      )}
    </div>
  )
}