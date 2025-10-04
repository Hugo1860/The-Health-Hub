#!/usr/bin/env node
/**
 * 清理孤儿文件脚本
 * 找出文件系统中存在但数据库中没有记录的文件
 */

const fs = require('fs').promises;
const path = require('path');
const mysql = require('mysql2/promise');

const DRY_RUN = process.argv.includes('--dry-run');
const VERBOSE = process.argv.includes('--verbose');

const UPLOADS_DIR = path.join(process.cwd(), 'public/uploads');

async function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  
  const prefix = { info: 'ℹ️ ', success: '✅', warning: '⚠️ ', error: '❌' };
  console.log(`${colors[type]}${prefix[type]} ${message}${colors.reset}`);
}

async function getDbConnection() {
  return mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'health_hub'
  });
}

async function scanDirectory(dir, baseDir = '') {
  const files = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.join(baseDir, entry.name);
    
    if (entry.isDirectory()) {
      const subFiles = await scanDirectory(fullPath, relativePath);
      files.push(...subFiles);
    } else {
      files.push(relativePath);
    }
  }
  
  return files;
}

async function findOrphanAudioFiles(connection) {
  log('🔍 扫描音频文件...', 'info');
  
  // 1. 获取文件系统中的所有音频文件
  const audioDir = path.join(UPLOADS_DIR, 'audios');
  let fsFiles = [];
  
  try {
    fsFiles = await scanDirectory(audioDir);
    fsFiles = fsFiles.map(f => `/uploads/audios/${f}`);
  } catch (error) {
    log(`扫描目录失败: ${error.message}`, 'error');
    return [];
  }
  
  log(`  找到 ${fsFiles.length} 个文件`, 'info');
  
  // 2. 获取数据库中的文件记录
  const [rows] = await connection.query('SELECT url FROM audios WHERE url IS NOT NULL');
  const dbFiles = new Set(rows.map(r => r.url));
  
  log(`  数据库中有 ${dbFiles.size} 条记录`, 'info');
  
  // 3. 找出孤儿文件
  const orphans = fsFiles.filter(file => !dbFiles.has(file));
  
  return orphans;
}

async function findOrphanCoverFiles(connection) {
  log('🔍 扫描封面文件...', 'info');
  
  // 1. 获取文件系统中的所有封面文件
  const coverDir = path.join(UPLOADS_DIR, 'covers');
  let fsFiles = [];
  
  try {
    fsFiles = await scanDirectory(coverDir);
    fsFiles = fsFiles.map(f => `/uploads/covers/${f}`);
  } catch (error) {
    log(`扫描目录失败: ${error.message}`, 'error');
    return [];
  }
  
  log(`  找到 ${fsFiles.length} 个文件`, 'info');
  
  // 2. 获取数据库中的文件记录
  const [rows] = await connection.query('SELECT coverImage FROM audios WHERE coverImage IS NOT NULL');
  const dbFiles = new Set(rows.map(r => r.coverImage));
  
  log(`  数据库中有 ${dbFiles.size} 条记录`, 'info');
  
  // 3. 找出孤儿文件
  const orphans = fsFiles.filter(file => !dbFiles.has(file));
  
  return orphans;
}

async function moveToTrash(files) {
  const trashDir = path.join(UPLOADS_DIR, 'trash');
  let moved = 0;
  let failed = 0;
  
  for (const file of files) {
    const sourcePath = path.join(process.cwd(), 'public', file);
    const filename = path.basename(file);
    const destPath = path.join(trashDir, 'audios', filename);
    
    if (VERBOSE) {
      log(`  移动: ${file}`, 'info');
    }
    
    if (!DRY_RUN) {
      try {
        await fs.rename(sourcePath, destPath);
        moved++;
      } catch (error) {
        log(`移动失败: ${file} - ${error.message}`, 'error');
        failed++;
      }
    } else {
      moved++;
    }
  }
  
  return { moved, failed };
}

async function getFileSize(filePath) {
  try {
    const stats = await fs.stat(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

async function main() {
  log('🗑️  孤儿文件清理工具', 'success');
  log('='.repeat(50));
  
  if (DRY_RUN) {
    log('🔍 干运行模式 (不会实际删除文件)', 'warning');
  }
  
  let connection;
  
  try {
    // 连接数据库
    log('连接数据库...', 'info');
    connection = await getDbConnection();
    log('数据库连接成功', 'success');
    
    // 查找孤儿文件
    const audioOrphans = await findOrphanAudioFiles(connection);
    const coverOrphans = await findOrphanCoverFiles(connection);
    
    log('\n📊 扫描结果:', 'success');
    log(`  音频孤儿文件: ${audioOrphans.length} 个`);
    log(`  封面孤儿文件: ${coverOrphans.length} 个`);
    
    if (audioOrphans.length === 0 && coverOrphans.length === 0) {
      log('\n✨ 没有发现孤儿文件！', 'success');
      return;
    }
    
    // 计算总大小
    let totalSize = 0;
    for (const file of [...audioOrphans, ...coverOrphans]) {
      const filePath = path.join(process.cwd(), 'public', file);
      totalSize += await getFileSize(filePath);
    }
    
    log(`  总大小: ${formatBytes(totalSize)}`);
    
    // 显示前10个孤儿文件示例
    if (VERBOSE && audioOrphans.length > 0) {
      log('\n音频孤儿文件示例 (前10个):', 'info');
      audioOrphans.slice(0, 10).forEach(file => {
        log(`  - ${file}`, 'warning');
      });
    }
    
    if (VERBOSE && coverOrphans.length > 0) {
      log('\n封面孤儿文件示例 (前10个):', 'info');
      coverOrphans.slice(0, 10).forEach(file => {
        log(`  - ${file}`, 'warning');
      });
    }
    
    // 移动到回收站
    if (!DRY_RUN) {
      log('\n🗑️  移动到回收站...', 'info');
      const audioResult = await moveToTrash(audioOrphans);
      log(`  音频文件: 移动 ${audioResult.moved} 个, 失败 ${audioResult.failed} 个`, 
        audioResult.failed > 0 ? 'warning' : 'success');
      
      const coverResult = await moveToTrash(coverOrphans);
      log(`  封面文件: 移动 ${coverResult.moved} 个, 失败 ${coverResult.failed} 个`,
        coverResult.failed > 0 ? 'warning' : 'success');
      
      log(`\n可释放空间: ${formatBytes(totalSize)}`, 'success');
    } else {
      log('\n提示: 移除 --dry-run 参数来实际移动文件', 'info');
    }
    
  } catch (error) {
    log(`执行失败: ${error.message}`, 'error');
    console.error(error);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
    }
  }
}

// 运行脚本
main();

