#!/usr/bin/env node
/**
 * 文件整理脚本
 * 将散落的文件整理到规范的目录结构中
 */

const fs = require('fs').promises;
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.m4a', '.aac'];
const IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];

async function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',    // Cyan
    success: '\x1b[32m', // Green
    warning: '\x1b[33m', // Yellow
    error: '\x1b[31m',   // Red
    reset: '\x1b[0m'     // Reset
  };
  
  const prefix = {
    info: 'ℹ️ ',
    success: '✅',
    warning: '⚠️ ',
    error: '❌'
  };
  
  console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
}

async function createDirectoryStructure() {
  const years = ['2024', '2025'];
  const months = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  
  const dirs = [
    'audios/temp',
    'covers/thumbnails',
    'documents/slides',
    'trash/audios',
    'trash/covers'
  ];
  
  // 创建年月目录
  for (const baseDir of ['audios', 'covers']) {
    for (const year of years) {
      for (const month of months) {
        dirs.push(`${baseDir}/${year}/${month}`);
      }
    }
  }
  
  log('创建目录结构...', 'info');
  for (const dir of dirs) {
    const fullPath = path.join(UPLOADS_DIR, dir);
    if (!DRY_RUN) {
      await fs.mkdir(fullPath, { recursive: true });
    }
    if (VERBOSE) {
      log(`  创建: ${dir}`, 'info');
    }
  }
  log(`创建了 ${dirs.length} 个目录`, 'success');
}

async function getFileStats(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats;
  } catch (error) {
    return null;
  }
}

async function organizeFiles() {
  log('开始扫描文件...', 'info');
  
  const files = await fs.readdir(UPLOADS_DIR);
  const stats = {
    audios: { moved: 0, skipped: 0 },
    covers: { moved: 0, skipped: 0 },
    other: { moved: 0, skipped: 0 }
  };
  
  for (const file of files) {
    const filePath = path.join(UPLOADS_DIR, file);
    const fileStats = await getFileStats(filePath);
    
    // 跳过目录
    if (!fileStats || fileStats.isDirectory()) {
      continue;
    }
    
    const ext = path.extname(file).toLowerCase();
    
    // 处理音频文件
    if (AUDIO_EXTENSIONS.includes(ext)) {
      const moved = await moveAudioFile(file, fileStats);
      if (moved) {
        stats.audios.moved++;
      } else {
        stats.audios.skipped++;
      }
    }
    // 处理图片文件
    else if (IMAGE_EXTENSIONS.includes(ext)) {
      const moved = await moveCoverFile(file, fileStats);
      if (moved) {
        stats.covers.moved++;
      } else {
        stats.covers.skipped++;
      }
    }
    // 其他文件
    else {
      if (VERBOSE) {
        log(`  跳过: ${file} (未知类型)`, 'warning');
      }
      stats.other.skipped++;
    }
  }
  
  // 输出统计
  log('\n整理完成！', 'success');
  log(`音频文件: 移动 ${stats.audios.moved} 个, 跳过 ${stats.audios.skipped} 个`);
  log(`封面文件: 移动 ${stats.covers.moved} 个, 跳过 ${stats.covers.skipped} 个`);
  log(`其他文件: 跳过 ${stats.other.skipped} 个`);
}

async function moveAudioFile(filename, stats) {
  const date = new Date(stats.mtime);
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const ext = path.extname(filename);
  const newFilename = `${uuidv4()}${ext}`;
  
  const oldPath = path.join(UPLOADS_DIR, filename);
  const newPath = path.join(UPLOADS_DIR, 'audios', year, month, newFilename);
  
  if (VERBOSE) {
    log(`  音频: ${filename} → audios/${year}/${month}/${newFilename}`, 'info');
  }
  
  if (!DRY_RUN) {
    try {
      await fs.rename(oldPath, newPath);
      return true;
    } catch (error) {
      log(`移动失败: ${filename} - ${error.message}`, 'error');
      return false;
    }
  }
  
  return true;
}

async function moveCoverFile(filename, stats) {
  const date = new Date(stats.mtime);
  const year = date.getFullYear().toString();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const ext = path.extname(filename);
  const newFilename = `${uuidv4()}${ext}`;
  
  const oldPath = path.join(UPLOADS_DIR, filename);
  const newPath = path.join(UPLOADS_DIR, 'covers', year, month, newFilename);
  
  if (VERBOSE) {
    log(`  封面: ${filename} → covers/${year}/${month}/${newFilename}`, 'info');
  }
  
  if (!DRY_RUN) {
    try {
      await fs.rename(oldPath, newPath);
      return true;
    } catch (error) {
      log(`移动失败: ${filename} - ${error.message}`, 'error');
      return false;
    }
  }
  
  return true;
}

async function main() {
  log('🎵 音频文件整理工具', 'success');
  log('='.repeat(50));
  
  if (DRY_RUN) {
    log('🔍 干运行模式 (不会实际移动文件)', 'warning');
  }
  
  try {
    await createDirectoryStructure();
    await organizeFiles();
    
    if (DRY_RUN) {
      log('\n提示: 移除 --dry-run 参数来实际执行文件移动', 'info');
    }
  } catch (error) {
    log(`执行失败: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  }
}

// 运行脚本
main();

