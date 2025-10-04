'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

interface LogoProps {
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
  style?: React.CSSProperties;
}

export default function Logo({ 
  size = 'medium', 
  onClick,
  style = {}
}: LogoProps) {
  const router = useRouter();
  const [imageError, setImageError] = useState(false);

  // 尺寸配置
  const sizeConfig = {
    small: {
      width: 120,
      height: 40
    },
    medium: {
      width: 160,
      height: 50
    },
    large: {
      width: 200,
      height: 60
    }
  };

  const config = sizeConfig[size];

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/');
    }
  };

  if (imageError) {
    // 图片加载失败时的备用方案
    return (
      <div
        onClick={handleClick}
        style={{
          width: config.width,
          height: config.height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          backgroundColor: '#f0f0f0',
          borderRadius: 8,
          fontSize: size === 'large' ? 18 : size === 'medium' ? 16 : 14,
          fontWeight: 'bold',
          color: '#666',
          transition: 'all 0.3s ease',
          ...style
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.02)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        健闻局
      </div>
    );
  }

  return (
    <div
      onClick={handleClick}
      style={{
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        borderRadius: 8,
        overflow: 'hidden',
        ...style
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 4px 16px rgba(0, 0, 0, 0.1)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.05)';
      }}
    >
      <Image
        src="/uploads/logo.jpg"
        alt="健闻局Logo"
        width={config.width}
        height={config.height}
        style={{
          width: config.width,
          height: config.height,
          objectFit: 'contain',
          borderRadius: 8
        }}
        onError={() => setImageError(true)}
        priority={size === 'large' || size === 'medium'}
        quality={90}
      />
    </div>
  );
}