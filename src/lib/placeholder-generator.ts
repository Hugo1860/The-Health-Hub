// 生成占位符图片的工具函数

export function generateLogoSVG(): string {
  return `
    <svg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#1890ff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#096dd9;stop-opacity:1" />
        </linearGradient>
      </defs>
      <circle cx="30" cy="30" r="28" fill="url(#logoGradient)" stroke="#ffffff" stroke-width="2"/>
      <path d="M20 25 L25 20 L35 30 L25 40 L20 35 Z" fill="#ffffff"/>
      <circle cx="40" cy="20" r="3" fill="#ffffff"/>
      <circle cx="40" cy="30" r="2" fill="#ffffff"/>
      <circle cx="40" cy="40" r="3" fill="#ffffff"/>
    </svg>
  `;
}

export function generateAudioPlaceholderSVG(): string {
  return `
    <svg width="300" height="300" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#f0f9ff;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#e0f2fe;stop-opacity:1" />
        </linearGradient>
      </defs>
      <rect width="300" height="300" fill="url(#bgGradient)" rx="20"/>
      <circle cx="150" cy="120" r="40" fill="#0284c7" opacity="0.8"/>
      <path d="M130 100 L130 140 L170 120 Z" fill="#ffffff"/>
      <rect x="100" y="180" width="100" height="8" rx="4" fill="#0284c7" opacity="0.6"/>
      <rect x="100" y="200" width="80" height="6" rx="3" fill="#0284c7" opacity="0.4"/>
      <rect x="100" y="220" width="120" height="6" rx="3" fill="#0284c7" opacity="0.4"/>
      <text x="150" y="260" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#0369a1">音频内容</text>
    </svg>
  `;
}

export function svgToDataURL(svg: string): string {
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

// 生成默认资源的 Data URLs
export const DEFAULT_LOGO_DATA_URL = svgToDataURL(generateLogoSVG());
export const DEFAULT_AUDIO_PLACEHOLDER_DATA_URL = svgToDataURL(generateAudioPlaceholderSVG());