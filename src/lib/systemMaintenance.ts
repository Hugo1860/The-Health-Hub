import { readFile, writeFile, readdir, mkdir, stat, copyFile } from 'fs/promises';
import { join, dirname } from 'path';
import { existsSync } from 'fs';
import { securityLogger } from './securityLogger';

interface BackupInfo {
  id: string;
  timestamp: string;
  type: 'full' | 'data' | 'config';
  size: number;
  files: string[];
  description?: string;
}

interface SystemStatus {
  uptime: number;
  memoryUsage: NodeJS.MemoryUsage;
  diskSpace: {
    total: number;
    used: number;
    free: number;
  };
  lastBackup?: string;
  errorCount: number;
  activeUsers: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

class SystemMaintenance {
  private backupDir: string;
  private dataDir: string;
  private configDir: string;
  private backupInfoFile: string;

  constructor() {
    this.backupDir = join(process.cwd(), 'backups');
    this.dataDir = join(process.cwd(), 'data');
    this.configDir = join(process.cwd(), '.kiro');
    this.backupInfoFile = join(this.backupDir, 'backup-info.json');
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    try {
      if (!existsSync(this.backupDir)) {
        await mkdir(this.backupDir, { recursive: true });
      }
      if (!existsSync(this.dataDir)) {
        await mkdir(this.dataDir, { recursive: true });
      }
    } catch (error) {
      console.error('Failed to ensure directories:', error);
    }
  }

  // 获取备份信息列表
  private async getBackupInfo(): Promise<BackupInfo[]> {
    try {
      if (!existsSync(this.backupInfoFile)) {
        return [];
      }
      const data = await readFile(this.backupInfoFile, 'utf8');
      const backups = JSON.parse(data);
      return Array.isArray(backups) ? backups : [];
    } catch (error) {
      console.error('Failed to read backup info:', error);
      return [];
    }
  }

  // 保存备份信息
  private async saveBackupInfo(backups: BackupInfo[]): Promise<void> {
    try {
      await writeFile(this.backupInfoFile, JSON.stringify(backups, null, 2));
    } catch (error) {
      console.error('Failed to save backup info:', error);
      throw new Error('保存备份信息失败');
    }
  }

  // 计算目录大小
  private async calculateDirectorySize(dirPath: string): Promise<number> {
    let totalSize = 0;
    
    try {
      if (!existsSync(dirPath)) {
        return 0;
      }

      const files = await readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = join(dirPath, file.name);
        
        if (file.isDirectory()) {
          totalSize += await this.calculateDirectorySize(filePath);
        } else {
          const stats = await stat(filePath);
          totalSize += stats.size;
        }
      }
    } catch (error) {
      console.error(`Failed to calculate directory size for ${dirPath}:`, error);
    }
    
    return totalSize;
  }

  // 复制目录
  private async copyDirectory(src: string, dest: string): Promise<string[]> {
    const copiedFiles: string[] = [];
    
    try {
      if (!existsSync(src)) {
        return copiedFiles;
      }

      await mkdir(dest, { recursive: true });
      const files = await readdir(src, { withFileTypes: true });
      
      for (const file of files) {
        const srcPath = join(src, file.name);
        const destPath = join(dest, file.name);
        
        if (file.isDirectory()) {
          const subFiles = await this.copyDirectory(srcPath, destPath);
          copiedFiles.push(...subFiles);
        } else {
          await copyFile(srcPath, destPath);
          copiedFiles.push(srcPath);
        }
      }
    } catch (error) {
      console.error(`Failed to copy directory from ${src} to ${dest}:`, error);
      throw error;
    }
    
    return copiedFiles;
  }

  // 创建完整备份
  async createFullBackup(description?: string): Promise<BackupInfo> {
    const backupId = `full_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const backupPath = join(this.backupDir, backupId);
    const copiedFiles: string[] = [];

    try {
      await mkdir(backupPath, { recursive: true });

      // 备份数据文件
      if (existsSync(this.dataDir)) {
        const dataBackupPath = join(backupPath, 'data');
        const dataFiles = await this.copyDirectory(this.dataDir, dataBackupPath);
        copiedFiles.push(...dataFiles);
      }

      // 备份配置文件
      if (existsSync(this.configDir)) {
        const configBackupPath = join(backupPath, 'config');
        const configFiles = await this.copyDirectory(this.configDir, configBackupPath);
        copiedFiles.push(...configFiles);
      }

      // 备份上传的文件
      const uploadsDir = join(process.cwd(), 'public', 'uploads');
      if (existsSync(uploadsDir)) {
        const uploadsBackupPath = join(backupPath, 'uploads');
        const uploadFiles = await this.copyDirectory(uploadsDir, uploadsBackupPath);
        copiedFiles.push(...uploadFiles);
      }

      // 计算备份大小
      const backupSize = await this.calculateDirectorySize(backupPath);

      const backupInfo: BackupInfo = {
        id: backupId,
        timestamp: new Date().toISOString(),
        type: 'full',
        size: backupSize,
        files: copiedFiles,
        description: description || '完整系统备份',
      };

      // 保存备份信息
      const backups = await this.getBackupInfo();
      backups.push(backupInfo);
      await this.saveBackupInfo(backups);

      // 记录备份操作
      await securityLogger.logEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'LOW',
        ip: 'system',
        endpoint: '/system/backup',
        details: {
          activity: 'System backup created',
          backupId,
          backupSize,
          fileCount: copiedFiles.length,
        },
        action: 'BACKUP_CREATED',
      });

      return backupInfo;
    } catch (error) {
      console.error('Failed to create full backup:', error);
      throw new Error('创建完整备份失败');
    }
  }

  // 创建数据备份
  async createDataBackup(description?: string): Promise<BackupInfo> {
    const backupId = `data_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const backupPath = join(this.backupDir, backupId);

    try {
      await mkdir(backupPath, { recursive: true });

      // 只备份数据文件
      const copiedFiles = await this.copyDirectory(this.dataDir, join(backupPath, 'data'));
      const backupSize = await this.calculateDirectorySize(backupPath);

      const backupInfo: BackupInfo = {
        id: backupId,
        timestamp: new Date().toISOString(),
        type: 'data',
        size: backupSize,
        files: copiedFiles,
        description: description || '数据备份',
      };

      const backups = await this.getBackupInfo();
      backups.push(backupInfo);
      await this.saveBackupInfo(backups);

      return backupInfo;
    } catch (error) {
      console.error('Failed to create data backup:', error);
      throw new Error('创建数据备份失败');
    }
  }

  // 获取所有备份列表
  async getBackups(): Promise<BackupInfo[]> {
    return this.getBackupInfo();
  }

  // 删除备份
  async deleteBackup(backupId: string): Promise<void> {
    try {
      const backups = await this.getBackupInfo();
      const backupIndex = backups.findIndex(b => b.id === backupId);
      
      if (backupIndex === -1) {
        throw new Error('备份不存在');
      }

      // 删除备份文件夹
      const backupPath = join(this.backupDir, backupId);
      if (existsSync(backupPath)) {
        await this.removeDirectory(backupPath);
      }

      // 从备份信息中移除
      backups.splice(backupIndex, 1);
      await this.saveBackupInfo(backups);

      // 记录删除操作
      await securityLogger.logEvent({
        type: 'SUSPICIOUS_ACTIVITY',
        severity: 'LOW',
        ip: 'system',
        endpoint: '/system/backup',
        details: {
          activity: 'System backup deleted',
          backupId,
        },
        action: 'BACKUP_DELETED',
      });
    } catch (error) {
      console.error('Failed to delete backup:', error);
      throw new Error('删除备份失败');
    }
  }

  // 递归删除目录
  private async removeDirectory(dirPath: string): Promise<void> {
    try {
      const files = await readdir(dirPath, { withFileTypes: true });
      
      for (const file of files) {
        const filePath = join(dirPath, file.name);
        
        if (file.isDirectory()) {
          await this.removeDirectory(filePath);
        } else {
          await import('fs/promises').then(fs => fs.unlink(filePath));
        }
      }
      
      await import('fs/promises').then(fs => fs.rmdir(dirPath));
    } catch (error) {
      console.error(`Failed to remove directory ${dirPath}:`, error);
      throw error;
    }
  }

  // 获取系统状态
  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const memoryUsage = process.memoryUsage();
      const uptime = process.uptime();
      
      // 获取最后备份时间（添加错误处理）
      let lastBackup: string | undefined;
      try {
        const backups = await this.getBackupInfo();
        if (backups.length > 0) {
          const sortedBackups = backups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          lastBackup = sortedBackups[0].timestamp;
        }
      } catch (error) {
        console.error('Failed to get backup info for system status:', error);
        lastBackup = undefined;
      }

      // 获取错误统计（添加错误处理）
      let errorCount = 0;
      try {
        const securityStats = await securityLogger.getSecurityStats();
        errorCount = (securityStats.eventsBySeverity.HIGH || 0) + (securityStats.eventsBySeverity.CRITICAL || 0);
      } catch (error) {
        console.error('Failed to get security stats for system status:', error);
        errorCount = 0;
      }

      // 计算磁盘使用情况（添加错误处理和默认值）
      let dataSize = 0;
      let uploadsSize = 0;
      let backupSize = 0;
      
      try {
        dataSize = await this.calculateDirectorySize(this.dataDir);
      } catch (error) {
        console.error('Failed to calculate data directory size:', error);
      }
      
      try {
        uploadsSize = await this.calculateDirectorySize(join(process.cwd(), 'public', 'uploads'));
      } catch (error) {
        console.error('Failed to calculate uploads directory size:', error);
      }
      
      try {
        backupSize = await this.calculateDirectorySize(this.backupDir);
      } catch (error) {
        console.error('Failed to calculate backup directory size:', error);
      }
      
      const totalUsed = dataSize + uploadsSize + backupSize;
      const estimatedTotal = Math.max(totalUsed * 10, 1024 * 1024 * 1024); // 至少1GB
      
      // 判断系统健康状态
      let systemHealth: 'healthy' | 'warning' | 'critical' = 'healthy';
      
      const memoryUsageRatio = memoryUsage.heapTotal > 0 ? memoryUsage.heapUsed / memoryUsage.heapTotal : 0;
      
      if (errorCount > 50 || memoryUsageRatio > 0.9) {
        systemHealth = 'critical';
      } else if (errorCount > 10 || memoryUsageRatio > 0.7) {
        systemHealth = 'warning';
      }

      return {
        uptime,
        memoryUsage,
        diskSpace: {
          total: estimatedTotal,
          used: totalUsed,
          free: estimatedTotal - totalUsed,
        },
        lastBackup,
        errorCount,
        activeUsers: 0, // 这里可以实现活跃用户统计
        systemHealth,
      };
    } catch (error) {
      console.error('Failed to get system status:', error);
      
      // 返回基本的系统状态，即使部分功能失败
      return {
        uptime: process.uptime(),
        memoryUsage: process.memoryUsage(),
        diskSpace: {
          total: 1024 * 1024 * 1024, // 1GB 默认值
          used: 0,
          free: 1024 * 1024 * 1024,
        },
        lastBackup: undefined,
        errorCount: 0,
        activeUsers: 0,
        systemHealth: 'warning', // 由于获取状态失败，标记为警告
      };
    }
  }

  // 清理旧备份
  async cleanupOldBackups(keepCount: number = 10): Promise<number> {
    try {
      const backups = await this.getBackupInfo();
      
      if (backups.length <= keepCount) {
        return 0;
      }

      // 按时间排序，保留最新的
      const sortedBackups = backups.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );

      const backupsToDelete = sortedBackups.slice(keepCount);
      let deletedCount = 0;

      for (const backup of backupsToDelete) {
        try {
          await this.deleteBackup(backup.id);
          deletedCount++;
        } catch (error) {
          console.error(`Failed to delete backup ${backup.id}:`, error);
        }
      }

      return deletedCount;
    } catch (error) {
      console.error('Failed to cleanup old backups:', error);
      throw new Error('清理旧备份失败');
    }
  }

  // 验证备份完整性
  async verifyBackup(backupId: string): Promise<{
    isValid: boolean;
    missingFiles: string[];
    errors: string[];
  }> {
    try {
      const backups = await this.getBackupInfo();
      const backup = backups.find(b => b.id === backupId);
      
      if (!backup) {
        return {
          isValid: false,
          missingFiles: [],
          errors: ['备份不存在'],
        };
      }

      const backupPath = join(this.backupDir, backupId);
      const missingFiles: string[] = [];
      const errors: string[] = [];

      if (!existsSync(backupPath)) {
        errors.push('备份目录不存在');
        return { isValid: false, missingFiles, errors };
      }

      // 检查备份目录结构
      const expectedDirs = backup.type === 'full' 
        ? ['data', 'config', 'uploads'] 
        : ['data'];

      for (const dir of expectedDirs) {
        const dirPath = join(backupPath, dir);
        if (!existsSync(dirPath)) {
          missingFiles.push(dir);
        }
      }

      const isValid = missingFiles.length === 0 && errors.length === 0;

      return {
        isValid,
        missingFiles,
        errors,
      };
    } catch (error) {
      console.error('Failed to verify backup:', error);
      return {
        isValid: false,
        missingFiles: [],
        errors: ['验证备份时发生错误'],
      };
    }
  }
}

// 单例实例
export const systemMaintenance = new SystemMaintenance();

// 便捷函数
export const createFullBackup = (description?: string) => {
  return systemMaintenance.createFullBackup(description);
};

export const createDataBackup = (description?: string) => {
  return systemMaintenance.createDataBackup(description);
};

export const getSystemStatus = () => {
  return systemMaintenance.getSystemStatus();
};

export const getBackups = () => {
  return systemMaintenance.getBackups();
};

export const deleteBackup = (backupId: string) => {
  return systemMaintenance.deleteBackup(backupId);
};

export const cleanupOldBackups = (keepCount?: number) => {
  return systemMaintenance.cleanupOldBackups(keepCount);
};

export const verifyBackup = (backupId: string) => {
  return systemMaintenance.verifyBackup(backupId);
};