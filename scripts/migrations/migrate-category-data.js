#!/usr/bin/env node

/**
 * 分类层级功能应用层数据迁移脚本
 * 
 * 功能：
 * 1. 将现有音频的 subject 字段映射到新的 category_id 字段
 * 2. 创建默认的分类层级结构
 * 3. 验证数据迁移的完整性
 * 4. 生成迁移报告
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// 数据库连接配置
const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_DATABASE || 'health_hub',
  user: process.env.DB_USERNAME || process.env.USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  ssl: process.env.DB_SSL === 'true'
};

// 默认分类映射配置
const DEFAULT_CATEGORY_MAPPING = {
  '心血管': {
    id: 'cardiology',
    name: '心血管',
    description: '心血管疾病相关音频内容',
    color: '#e74c3c',
    icon: '❤️',
    subcategories: [
      { id: 'hypertension', name: '高血压', description: '高血压相关内容' },
      { id: 'coronary-heart-disease', name: '冠心病', description: '冠心病相关内容' },
      { id: 'arrhythmia', name: '心律失常', description: '心律失常相关内容' }
    ]
  },
  '神经科': {
    id: 'neurology',
    name: '神经科',
    description: '神经系统疾病相关音频内容',
    color: '#9b59b6',
    icon: '🧠',
    subcategories: [
      { id: 'stroke', name: '脑卒中', description: '脑卒中相关内容' },
      { id: 'epilepsy', name: '癫痫', description: '癫痫相关内容' },
      { id: 'dementia', name: '痴呆', description: '痴呆相关内容' }
    ]
  },
  '肿瘤科': {
    id: 'oncology',
    name: '肿瘤科',
    description: '肿瘤疾病相关音频内容',
    color: '#34495e',
    icon: '🎗️',
    subcategories: [
      { id: 'lung-cancer', name: '肺癌', description: '肺癌相关内容' },
      { id: 'breast-cancer', name: '乳腺癌', description: '乳腺癌相关内容' },
      { id: 'gastric-cancer', name: '胃癌', description: '胃癌相关内容' }
    ]
  },
  '外科': {
    id: 'surgery',
    name: '外科',
    description: '外科手术相关音频内容',
    color: '#27ae60',
    icon: '🔬',
    subcategories: [
      { id: 'general-surgery', name: '普外科', description: '普通外科相关内容' },
      { id: 'orthopedics', name: '骨科', description: '骨科相关内容' },
      { id: 'neurosurgery', name: '神经外科', description: '神经外科相关内容' }
    ]
  },
  '儿科': {
    id: 'pediatrics',
    name: '儿科',
    description: '儿童疾病相关音频内容',
    color: '#f39c12',
    icon: '👶',
    subcategories: [
      { id: 'neonatology', name: '新生儿科', description: '新生儿相关内容' },
      { id: 'pediatric-cardiology', name: '小儿心脏科', description: '小儿心脏病相关内容' },
      { id: 'pediatric-neurology', name: '小儿神经科', description: '小儿神经疾病相关内容' }
    ]
  },
  '妇产科': {
    id: 'gynecology',
    name: '妇产科',
    description: '妇产科疾病相关音频内容',
    color: '#e91e63',
    icon: '👩‍⚕️',
    subcategories: [
      { id: 'obstetrics', name: '产科', description: '产科相关内容' },
      { id: 'gynecology-diseases', name: '妇科疾病', description: '妇科疾病相关内容' },
      { id: 'reproductive-health', name: '生殖健康', description: '生殖健康相关内容' }
    ]
  },
  '精神科': {
    id: 'psychiatry',
    name: '精神科',
    description: '精神心理疾病相关音频内容',
    color: '#3f51b5',
    icon: '🧘',
    subcategories: [
      { id: 'depression', name: '抑郁症', description: '抑郁症相关内容' },
      { id: 'anxiety', name: '焦虑症', description: '焦虑症相关内容' },
      { id: 'bipolar', name: '双相情感障碍', description: '双相情感障碍相关内容' }
    ]
  },
  '影像科': {
    id: 'radiology',
    name: '影像科',
    description: '医学影像相关音频内容',
    color: '#607d8b',
    icon: '📷',
    subcategories: [
      { id: 'ct-scan', name: 'CT检查', description: 'CT检查相关内容' },
      { id: 'mri', name: 'MRI检查', description: 'MRI检查相关内容' },
      { id: 'ultrasound', name: '超声检查', description: '超声检查相关内容' }
    ]
  },
  '检验科': {
    id: 'laboratory',
    name: '检验科',
    description: '医学检验相关音频内容',
    color: '#795548',
    icon: '🔬',
    subcategories: [
      { id: 'blood-test', name: '血液检验', description: '血液检验相关内容' },
      { id: 'urine-test', name: '尿液检验', description: '尿液检验相关内容' },
      { id: 'biochemistry', name: '生化检验', description: '生化检验相关内容' }
    ]
  },
  '其他': {
    id: 'others',
    name: '其他',
    description: '其他医学相关音频内容',
    color: '#9e9e9e',
    icon: '📋',
    subcategories: [
      { id: 'general-medicine', name: '全科医学', description: '全科医学相关内容' },
      { id: 'preventive-medicine', name: '预防医学', description: '预防医学相关内容' },
      { id: 'rehabilitation', name: '康复医学', description: '康复医学相关内容' }
    ]
  }
};

class CategoryMigration {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.migrationLog = [];
    this.stats = {
      categoriesCreated: 0,
      subcategoriesCreated: 0,
      audiosUpdated: 0,
      errors: 0
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] [${level.toUpperCase()}] ${message}`;
    console.log(logEntry);
    this.migrationLog.push(logEntry);
  }

  async connect() {
    try {
      await this.pool.connect();
      this.log('✅ 数据库连接成功');
    } catch (error) {
      this.log(`❌ 数据库连接失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async disconnect() {
    try {
      await this.pool.end();
      this.log('✅ 数据库连接已关闭');
    } catch (error) {
      this.log(`⚠️ 关闭数据库连接时出错: ${error.message}`, 'warn');
    }
  }

  async checkDatabaseSchema() {
    this.log('🔍 检查数据库结构...');
    
    try {
      // 检查 categories 表的新字段
      const categoryFields = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'categories' 
        AND column_name IN ('parent_id', 'level', 'sort_order', 'is_active')
      `);

      const requiredCategoryFields = ['parent_id', 'level', 'sort_order', 'is_active'];
      const existingCategoryFields = categoryFields.rows.map(row => row.column_name);
      const missingCategoryFields = requiredCategoryFields.filter(field => !existingCategoryFields.includes(field));

      if (missingCategoryFields.length > 0) {
        throw new Error(`categories 表缺少字段: ${missingCategoryFields.join(', ')}`);
      }

      // 检查 audios 表的新字段
      const audioFields = await this.pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'audios' 
        AND column_name IN ('category_id', 'subcategory_id')
      `);

      const requiredAudioFields = ['category_id', 'subcategory_id'];
      const existingAudioFields = audioFields.rows.map(row => row.column_name);
      const missingAudioFields = requiredAudioFields.filter(field => !existingAudioFields.includes(field));

      if (missingAudioFields.length > 0) {
        throw new Error(`audios 表缺少字段: ${missingAudioFields.join(', ')}`);
      }

      this.log('✅ 数据库结构检查通过');
    } catch (error) {
      this.log(`❌ 数据库结构检查失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async getExistingCategories() {
    try {
      const result = await this.pool.query('SELECT * FROM categories ORDER BY name');
      return result.rows;
    } catch (error) {
      this.log(`❌ 获取现有分类失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async getExistingAudios() {
    try {
      const result = await this.pool.query('SELECT id, subject FROM audios WHERE subject IS NOT NULL');
      return result.rows;
    } catch (error) {
      this.log(`❌ 获取现有音频失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async createDefaultCategories() {
    this.log('📁 创建默认分类结构...');

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const [subjectName, categoryConfig] of Object.entries(DEFAULT_CATEGORY_MAPPING)) {
        // 检查一级分类是否已存在
        const existingCategory = await client.query(
          'SELECT id FROM categories WHERE id = $1',
          [categoryConfig.id]
        );

        if (existingCategory.rows.length === 0) {
          // 创建一级分类
          await client.query(`
            INSERT INTO categories (
              id, name, description, color, icon, parent_id, level, sort_order, is_active, created_at, updated_at
            ) VALUES ($1, $2, $3, $4, $5, NULL, 1, $6, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
          `, [
            categoryConfig.id,
            categoryConfig.name,
            categoryConfig.description,
            categoryConfig.color,
            categoryConfig.icon,
            this.stats.categoriesCreated
          ]);

          this.stats.categoriesCreated++;
          this.log(`✅ 创建一级分类: ${categoryConfig.name} (${categoryConfig.id})`);
        } else {
          this.log(`ℹ️ 一级分类已存在: ${categoryConfig.name} (${categoryConfig.id})`);
        }

        // 创建二级分类
        for (let i = 0; i < categoryConfig.subcategories.length; i++) {
          const subcategory = categoryConfig.subcategories[i];
          
          const existingSubcategory = await client.query(
            'SELECT id FROM categories WHERE id = $1',
            [subcategory.id]
          );

          if (existingSubcategory.rows.length === 0) {
            await client.query(`
              INSERT INTO categories (
                id, name, description, color, icon, parent_id, level, sort_order, is_active, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, 2, $7, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
            `, [
              subcategory.id,
              subcategory.name,
              subcategory.description,
              categoryConfig.color,
              categoryConfig.icon,
              categoryConfig.id,
              i
            ]);

            this.stats.subcategoriesCreated++;
            this.log(`✅ 创建二级分类: ${subcategory.name} (${subcategory.id}) -> ${categoryConfig.name}`);
          } else {
            this.log(`ℹ️ 二级分类已存在: ${subcategory.name} (${subcategory.id})`);
          }
        }
      }

      await client.query('COMMIT');
      this.log(`✅ 默认分类结构创建完成 (${this.stats.categoriesCreated} 个一级分类, ${this.stats.subcategoriesCreated} 个二级分类)`);
    } catch (error) {
      await client.query('ROLLBACK');
      this.log(`❌ 创建默认分类失败: ${error.message}`, 'error');
      throw error;
    } finally {
      client.release();
    }
  }

  async migrateAudioCategories() {
    this.log('🎵 迁移音频分类数据...');

    const audios = await this.getExistingAudios();
    this.log(`📊 找到 ${audios.length} 个需要迁移的音频`);

    const client = await this.pool.connect();
    
    try {
      await client.query('BEGIN');

      for (const audio of audios) {
        const subject = audio.subject;
        
        // 查找匹配的分类
        let categoryId = null;
        
        // 精确匹配
        const categoryMapping = Object.values(DEFAULT_CATEGORY_MAPPING).find(
          cat => cat.name === subject
        );
        
        if (categoryMapping) {
          categoryId = categoryMapping.id;
        } else {
          // 模糊匹配
          const fuzzyMatch = Object.values(DEFAULT_CATEGORY_MAPPING).find(
            cat => subject.includes(cat.name) || cat.name.includes(subject)
          );
          
          if (fuzzyMatch) {
            categoryId = fuzzyMatch.id;
          } else {
            // 默认分类
            categoryId = 'others';
          }
        }

        // 更新音频的分类
        await client.query(`
          UPDATE audios 
          SET category_id = $1, subcategory_id = NULL
          WHERE id = $2
        `, [categoryId, audio.id]);

        this.stats.audiosUpdated++;
        
        if (this.stats.audiosUpdated % 100 === 0) {
          this.log(`📈 已迁移 ${this.stats.audiosUpdated} 个音频...`);
        }
      }

      await client.query('COMMIT');
      this.log(`✅ 音频分类迁移完成，共更新 ${this.stats.audiosUpdated} 个音频`);
    } catch (error) {
      await client.query('ROLLBACK');
      this.log(`❌ 音频分类迁移失败: ${error.message}`, 'error');
      throw error;
    } finally {
      client.release();
    }
  }

  async validateMigration() {
    this.log('🔍 验证迁移结果...');

    try {
      // 验证分类数据
      const categoryStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_categories,
          COUNT(CASE WHEN level = 1 THEN 1 END) as level1_count,
          COUNT(CASE WHEN level = 2 THEN 1 END) as level2_count,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_count
        FROM categories
      `);

      const stats = categoryStats.rows[0];
      this.log(`📊 分类统计: 总计 ${stats.total_categories}, 一级 ${stats.level1_count}, 二级 ${stats.level2_count}, 激活 ${stats.active_count}`);

      // 验证音频数据
      const audioStats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_audios,
          COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category,
          COUNT(CASE WHEN subcategory_id IS NOT NULL THEN 1 END) as with_subcategory
        FROM audios
      `);

      const audioStatsData = audioStats.rows[0];
      this.log(`📊 音频统计: 总计 ${audioStatsData.total_audios}, 有分类 ${audioStatsData.with_category}, 有子分类 ${audioStatsData.with_subcategory}`);

      // 验证数据一致性
      const inconsistentAudios = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM audios a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.category_id IS NOT NULL AND c.id IS NULL
      `);

      if (parseInt(inconsistentAudios.rows[0].count) > 0) {
        this.log(`⚠️ 发现 ${inconsistentAudios.rows[0].count} 个音频的分类ID无效`, 'warn');
      }

      this.log('✅ 迁移验证完成');
    } catch (error) {
      this.log(`❌ 迁移验证失败: ${error.message}`, 'error');
      throw error;
    }
  }

  async generateReport() {
    const reportPath = path.join(__dirname, `migration-report-${Date.now()}.txt`);
    
    const report = [
      '='.repeat(80),
      '分类层级功能数据迁移报告',
      '='.repeat(80),
      '',
      `迁移时间: ${new Date().toISOString()}`,
      `数据库: ${dbConfig.database}@${dbConfig.host}:${dbConfig.port}`,
      '',
      '迁移统计:',
      `- 创建一级分类: ${this.stats.categoriesCreated}`,
      `- 创建二级分类: ${this.stats.subcategoriesCreated}`,
      `- 更新音频记录: ${this.stats.audiosUpdated}`,
      `- 错误数量: ${this.stats.errors}`,
      '',
      '迁移日志:',
      '='.repeat(80),
      ...this.migrationLog,
      '',
      '='.repeat(80),
      '迁移完成',
      '='.repeat(80)
    ].join('\n');

    try {
      fs.writeFileSync(reportPath, report, 'utf8');
      this.log(`📄 迁移报告已生成: ${reportPath}`);
    } catch (error) {
      this.log(`⚠️ 生成迁移报告失败: ${error.message}`, 'warn');
    }
  }

  async run() {
    try {
      this.log('🚀 开始分类层级功能数据迁移...');
      
      await this.connect();
      await this.checkDatabaseSchema();
      await this.createDefaultCategories();
      await this.migrateAudioCategories();
      await this.validateMigration();
      
      this.log('✅ 数据迁移成功完成！');
    } catch (error) {
      this.stats.errors++;
      this.log(`❌ 数据迁移失败: ${error.message}`, 'error');
      process.exit(1);
    } finally {
      await this.generateReport();
      await this.disconnect();
    }
  }
}

// 主程序
if (require.main === module) {
  const migration = new CategoryMigration();
  migration.run().catch(error => {
    console.error('迁移脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = CategoryMigration;