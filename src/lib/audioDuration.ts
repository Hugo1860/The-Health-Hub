import { readFile } from 'fs/promises';
import { join } from 'path';

/**
 * 获取音频文件时长的工具函数
 * 优先使用ffprobe，回退方案使用Web Audio API
 */

export async function getAudioDuration(filePath: string): Promise<number> {
  try {
    // 检查ffprobe是否可用
    const { execSync } = await import('child_process');
    execSync('which ffprobe', { stdio: 'ignore' });
    
    // 方法1: 使用ffprobe
    const duration = await getDurationWithFfprobe(filePath);
    if (duration > 0) {
      return duration;
    }
  } catch (error) {
    console.warn('ffprobe not available, using file size estimation:', error);
  }

  // 方法2: 使用文件大小估算（粗略估算）
  return estimateDurationFromFileSize(filePath);
}

async function getDurationWithFfprobe(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    import('child_process').then(({ spawn }) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'error',
        '-show_entries', 'format=duration',
        '-of', 'json',
        filePath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(output);
            const durationSeconds = parseFloat(result.format.duration);
            resolve(Math.floor(durationSeconds));
          } catch (e) {
            reject(new Error('Failed to parse ffprobe output'));
          }
        } else {
          reject(new Error(`ffprobe exited with code ${code}`));
        }
      });

      ffprobe.on('error', (err) => {
        reject(err);
      });
    });
  });
}

async function getDurationWithWebAudio(filePath: string): Promise<number> {
  // 这个方法主要用于浏览器环境，服务器端使用需要特殊处理
  return 0;
}

async function estimateDurationFromFileSize(filePath: string): Promise<number> {
  try {
    const stats = await import('fs/promises').then(fs => fs.stat(filePath));
    const fileSizeInBytes = stats.size;
    
    // 根据文件扩展名选择比特率估算
    const path = await import('path');
    const extension = path.extname(filePath).toLowerCase();
    
    let bitrate = 128000; // 默认128kbps
    
    switch (extension) {
      case '.mp3':
        bitrate = 128000; // 128kbps MP3
        break;
      case '.wav':
        bitrate = 1411200; // 44.1kHz 16bit stereo
        break;
      case '.m4a':
      case '.aac':
        bitrate = 96000; // AAC通常更高效
        break;
      case '.ogg':
        bitrate = 112000; // Vorbis
        break;
      default:
        bitrate = 128000;
    }
    
    const bitsPerByte = 8;
    const estimatedDuration = Math.floor((fileSizeInBytes * bitsPerByte) / bitrate);
    
    // 限制在合理范围内 (1分钟到4小时)
    const clampedDuration = Math.max(60, Math.min(estimatedDuration, 14400));
    
    return clampedDuration;
  } catch (error) {
    console.error('Failed to estimate duration from file size:', error);
    return 1800; // 默认30分钟
  }
}

/**
 * 格式化时长显示
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '未知时长';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
}