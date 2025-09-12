// 简化的音频工具函数

// 修复音频 URL
export function fixAudioUrl(url?: string): string {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/')) return url;
  return `/uploads/${url}`;
}

// 格式化时长
export function formatDuration(seconds?: number): string {
  if (!seconds) return '未知';
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

// 格式化日期
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('zh-CN');
}

// 检查音频文件是否存在（简化版）
export async function checkAudioExists(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { method: 'HEAD' });
    return response.ok;
  } catch {
    return false;
  }
}

// 简化的 API 请求函数
export async function apiRequest(url: string, options?: RequestInit) {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
    });
    
    const data = await response.json();
    return { success: response.ok, data, status: response.status };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : '请求失败' };
  }
}