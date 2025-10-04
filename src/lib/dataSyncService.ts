/**
 * 数据同步服务
 * 
 * 功能：
 * 1. 自动同步新旧分类字段
 * 2. 定期检查数据一致性
 * 3. 修复数据不一致问题
 * 4. 提供数据迁移工具
 */

import db from '@/lib/db';
import CategoryService from '@/lib/categoryService';
import CategoryCompatibilityAdapter, { EnhancedAudio } from '@/lib/categoryCompatibility';
import { Category } from '@/types/category';

export interface SyncResult {
  success: boolean;
  processed: number;
  updated: number;
  errors: number;
  details: Array<{
    audioId: string;
    action: 'updated' | 'skipped' | 'error';
    message?: string;
  }>;
}

export interface ConsistencyReport {
  totalAudios: number;
  consistent: number;
  inconsistent: number;
  missingCategories: number;
  orphanedReferences: number;
  issues: Array<{
    audioId: string;
    title: string;
    issues: string[];
    suggestions: string[];
  }>;
}

/**
 * 数据同步服务类
 */
export class DataSyncService {
  private static instance: DataSyncService;
  private categories: Category[] = [];
  private lastCategoryUpdate = 0;
  private readonly CATEGORY_CACHE_TTL = 5 * 60 * 1000; // 5分钟

  private constructor() {}

  static getInstance(): DataSyncService {
    if (!DataSyncService.instance) {
      DataSyncService.instance = new DataSyncService();
    }
    return DataSyncService.instance;
  }

  /**
   * 获取缓存的分类数据
   */
  private async getCategories(): Promise<Category[]> {
    const now = Date.now();
    
    if (this.categories.length === 0 || now - this.lastCategoryUpdate > this.CATEGORY_CACHE_TTL) {
      this.categories = await CategoryService.getCategories({ includeInactive: true });
      this.lastCategoryUpdate = now;
    }
    
    return this.categories;
  }

  /**
   * 同步单个音频的分类字段
   */
  async syncAudioFields(audioId: string): Promise<{
    success: boolean;
    updated: boolean;
    message?: string;
  }> {
    try {
      // 获取音频数据
      const audioResult = await db.query(
        'SELECT * FROM audios WHERE id = $1',
        [audioId]
      );

      if (audioResult.rows.length === 0) {
        return {
          success: false,
          updated: false,
          message: '音频不存在'
        };
      }

      const audioData = audioResult.rows[0];
      const categories = await this.getCategories();

      // 构建增强音频对象
      const enhancedAudio: EnhancedAudio = {
        id: audioData.id,
        title: audioData.title,
        description: audioData.description,
        url: audioData.url,
        filename: audioData.filename,
        uploadDate: audioData.uploadDate,
        subject: audioData.subject,
        categoryId: audioData.category_id,
        subcategoryId: audioData.subcategory_id,
        tags: audioData.tags || [],
        coverImage: audioData.coverImage,
        playCount: audioData.play_count,
        duration: audioData.duration
      };

      // 同步字段
      const syncedFields = CategoryCompatibilityAdapter.syncAudioFields(
        enhancedAudio,
        categories
      );

      // 检查是否需要更新
      const needsUpdate = 
        audioData.category_id !== syncedFields.categoryId ||
        audioData.subcategory_id !== syncedFields.subcategoryId ||
        audioData.subject !== syncedFields.subject;

      if (!needsUpdate) {
        return {
          success: true,
          updated: false,
          message: '字段已同步，无需更新'
        };
      }

      // 更新数据库
      await db.query(`
        UPDATE audios 
        SET 
          category_id = $1,
          subcategory_id = $2,
          subject = $3,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = $4
      `, [
        syncedFields.categoryId,
        syncedFields.subcategoryId,
        syncedFields.subject,
        audioId
      ]);

      return {
        success: true,
        updated: true,
        message: '字段同步成功'
      };

    } catch (error) {
      console.error(`同步音频 ${audioId} 失败:`, error);
      return {
        success: false,
        updated: false,
        message: error instanceof Error ? error.message : '同步失败'
      };
    }
  }

  /**
   * 批量同步音频分类字段
   */
  async batchSyncAudioFields(
    audioIds?: string[],
    batchSize: number = 100
  ): Promise<SyncResult> {
    const result: SyncResult = {
      success: true,
      processed: 0,
      updated: 0,
      errors: 0,
      details: []
    };

    try {
      // 获取需要同步的音频ID列表
      let targetAudioIds: string[];
      
      if (audioIds) {
        targetAudioIds = audioIds;
      } else {
        // 获取所有音频ID
        const audioIdsResult = await db.query('SELECT id FROM audios ORDER BY id');
        targetAudioIds = audioIdsResult.rows.map(row => row.id);
      }

      console.log(`开始批量同步 ${targetAudioIds.length} 个音频的分类字段...`);

      // 分批处理
      for (let i = 0; i < targetAudioIds.length; i += batchSize) {
        const batch = targetAudioIds.slice(i, i + batchSize);
        
        console.log(`处理批次 ${Math.floor(i / batchSize) + 1}/${Math.ceil(targetAudioIds.length / batchSize)}`);

        for (const audioId of batch) {
          const syncResult = await this.syncAudioFields(audioId);
          
          result.processed++;
          
          if (syncResult.success) {
            if (syncResult.updated) {
              result.updated++;
              result.details.push({
                audioId,
                action: 'updated',
                message: syncResult.message
              });
            } else {
              result.details.push({
                audioId,
                action: 'skipped',
                message: syncResult.message
              });
            }
          } else {
            result.errors++;
            result.details.push({
              audioId,
              action: 'error',
              message: syncResult.message
            });
          }
        }

        // 避免过度占用资源
        if (i + batchSize < targetAudioIds.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      result.success = result.errors === 0;
      console.log(`批量同步完成: 处理 ${result.processed}, 更新 ${result.updated}, 错误 ${result.errors}`);

    } catch (error) {
      console.error('批量同步失败:', error);
      result.success = false;
      result.errors++;
    }

    return result;
  }

  /**
   * 检查数据一致性
   */
  async checkDataConsistency(): Promise<ConsistencyReport> {
    const report: ConsistencyReport = {
      totalAudios: 0,
      consistent: 0,
      inconsistent: 0,
      missingCategories: 0,
      orphanedReferences: 0,
      issues: []
    };

    try {
      // 获取所有音频数据
      const audiosResult = await db.query(`
        SELECT 
          a.*,
          c1.name as category_name,
          c2.name as subcategory_name
        FROM audios a
        LEFT JOIN categories c1 ON a.category_id = c1.id
        LEFT JOIN categories c2 ON a.subcategory_id = c2.id
      `);

      const categories = await this.getCategories();
      report.totalAudios = audiosResult.rows.length;

      for (const row of audiosResult.rows) {
        const enhancedAudio: EnhancedAudio = {
          id: row.id,
          title: row.title,
          description: row.description,
          url: row.url,
          filename: row.filename, uploadDate: row.uploadDate,
          subject: row.subject,
          categoryId: row.category_id,
          subcategoryId: row.subcategory_id,
          tags: row.tags || [], coverImage: row.coverImage,
          playCount: row.play_count,
          duration: row.duration
        };

        // 验证数据一致性
        const validation = CategoryCompatibilityAdapter.validateDataConsistency(
          enhancedAudio,
          categories
        );

        if (validation.isConsistent) {
          report.consistent++;
        } else {
          report.inconsistent++;
          report.issues.push({
            audioId: row.id,
            title: row.title,
            issues: validation.issues,
            suggestions: validation.suggestions
          });

          // 统计特定类型的问题
          if (validation.issues.some(issue => issue.includes('不存在'))) {
            if (row.category_id && !row.category_name) {
              report.orphanedReferences++;
            }
            if (row.subcategory_id && !row.subcategory_name) {
              report.orphanedReferences++;
            }
          }

          if (!row.category_id && !row.subcategory_id && row.subject) {
            report.missingCategories++;
          }
        }
      }

      console.log(`数据一致性检查完成: ${report.consistent}/${report.totalAudios} 一致`);

    } catch (error) {
      console.error('数据一致性检查失败:', error);
    }

    return report;
  }

  /**
   * 修复数据不一致问题
   */
  async fixDataInconsistency(audioIds?: string[]): Promise<SyncResult> {
    console.log('开始修复数据不一致问题...');
    
    // 使用批量同步来修复问题
    return this.batchSyncAudioFields(audioIds);
  }

  /**
   * 清理孤立的分类引用
   */
  async cleanupOrphanedReferences(): Promise<{
    success: boolean;
    cleaned: number;
    errors: number;
  }> {
    const result = {
      success: true,
      cleaned: 0,
      errors: 0
    };

    try {
      console.log('清理孤立的分类引用...');

      // 清理无效的 category_id 引用
      const categoryCleanup = await db.query(`
        UPDATE audios 
        SET category_id = NULL
        WHERE category_id IS NOT NULL 
        AND category_id NOT IN (SELECT id FROM categories WHERE level = 1)
      `);

      // 清理无效的 subcategory_id 引用
      const subcategoryCleanup = await db.query(`
        UPDATE audios 
        SET subcategory_id = NULL
        WHERE subcategory_id IS NOT NULL 
        AND subcategory_id NOT IN (SELECT id FROM categories WHERE level = 2)
      `);

      result.cleaned = (categoryCleanup.rowCount || 0) + (subcategoryCleanup.rowCount || 0);
      
      console.log(`清理完成: 清理了 ${result.cleaned} 个孤立引用`);

    } catch (error) {
      console.error('清理孤立引用失败:', error);
      result.success = false;
      result.errors++;
    }

    return result;
  }

  /**
   * 生成数据同步报告
   */
  async generateSyncReport(): Promise<{
    timestamp: string;
    consistencyReport: ConsistencyReport;
    recommendations: string[];
  }> {
    const consistencyReport = await this.checkDataConsistency();
    const recommendations: string[] = [];

    // 生成建议
    if (consistencyReport.inconsistent > 0) {
      recommendations.push(`发现 ${consistencyReport.inconsistent} 个数据不一致问题，建议运行数据修复`);
    }

    if (consistencyReport.orphanedReferences > 0) {
      recommendations.push(`发现 ${consistencyReport.orphanedReferences} 个孤立引用，建议清理无效数据`);
    }

    if (consistencyReport.missingCategories > 0) {
      recommendations.push(`发现 ${consistencyReport.missingCategories} 个音频缺少分类信息，建议运行分类映射`);
    }

    if (consistencyReport.consistent === consistencyReport.totalAudios) {
      recommendations.push('数据一致性良好，无需特殊处理');
    }

    return {
      timestamp: new Date().toISOString(),
      consistencyReport,
      recommendations
    };
  }

  /**
   * 定期数据同步任务
   */
  async scheduledSync(): Promise<void> {
    try {
      console.log('开始定期数据同步任务...');

      // 1. 检查数据一致性
      const report = await this.checkDataConsistency();
      
      // 2. 如果有不一致问题，自动修复
      if (report.inconsistent > 0) {
        console.log(`发现 ${report.inconsistent} 个不一致问题，开始自动修复...`);
        await this.fixDataInconsistency();
      }

      // 3. 清理孤立引用
      if (report.orphanedReferences > 0) {
        console.log(`发现 ${report.orphanedReferences} 个孤立引用，开始清理...`);
        await this.cleanupOrphanedReferences();
      }

      console.log('定期数据同步任务完成');

    } catch (error) {
      console.error('定期数据同步任务失败:', error);
    }
  }

  /**
   * 启动定期同步
   */
  startScheduledSync(intervalMinutes: number = 60): void {
    const intervalMs = intervalMinutes * 60 * 1000;
    
    console.log(`启动定期数据同步，间隔 ${intervalMinutes} 分钟`);
    
    // 立即执行一次
    this.scheduledSync();
    
    // 设置定期执行
    setInterval(() => {
      this.scheduledSync();
    }, intervalMs);
  }
}

// 导出单例实例
export default DataSyncService.getInstance();