/**
 * MySQL 连接池监控工具
 * 用于监控和诊断数据库连接池问题
 */

import { logPoolStats } from './adapters/mysqlAdapter';

let monitorInterval: NodeJS.Timeout | null = null;

// 启动连接池监控
export function startPoolMonitor(intervalMs: number = 30000) {
  if (monitorInterval) {
    console.log('⚠️  连接池监控已经在运行');
    return;
  }

  console.log(`🔍 启动 MySQL 连接池监控 (每 ${intervalMs / 1000} 秒)`);
  
  // 立即执行一次
  logPoolStats();
  
  // 定期监控
  monitorInterval = setInterval(() => {
    logPoolStats();
  }, intervalMs);
}

// 停止连接池监控
export function stopPoolMonitor() {
  if (monitorInterval) {
    clearInterval(monitorInterval);
    monitorInterval = null;
    console.log('🛑 已停止 MySQL 连接池监控');
  }
}

// 手动触发一次状态检查
export function checkPoolNow() {
  logPoolStats();
}

// 开发环境自动启动监控
if (process.env.NODE_ENV === 'development') {
  // 延迟 3 秒启动，避免启动时干扰
  setTimeout(() => {
    startPoolMonitor(60000); // 每 60 秒检查一次
  }, 3000);
}

