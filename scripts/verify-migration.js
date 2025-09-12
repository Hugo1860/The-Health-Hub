#!/usr/bin/env node

/**
 * 分类层级功能迁移验证脚本
 * 
 * 功能：
 * 1. 验证数据库结构是否正确
 * 2. 检查数据迁移的完整性
 * 3. 测试分类层级功能
 * 4. 生成验证报告
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

class MigrationVerifier {
  constructor() {
    this.pool = new Pool(dbConfig);
    this.results = {
      schemaTests: [],
      dataTests: [],
      functionalTests: [],
      errors: []
    };
  }

  log(message, level = 'info') {
    const timestamp = new Date().toISOString();
    const colors = {
      info: '\x1b[36m',
      warn: '\x1b[33m',
      error: '\x1b[31m',
      success: '\x1b[32m',
      reset: '\x1b[0m'
    };
    
    const color = colors[level] || colors.info;
    console.log(`${color}[${timestamp}] [${level.toUpperCase()}] ${message}${colors.reset}`);
  }

  async runTest(testName, testFunction) {
    try {
      this.log(`🧪 运行测试: ${testName}`);
      const result = await testFunction();
      
      const testResult = {
        name: testName,
        status: 'PASS',
        result,
        timestamp: new Date().toISOString()
      };

      this.log(`✅ 测试通过: ${testName}`);
      return testResult;
    } catch (error) {
      const testResult = {
        name: testName,
        status: 'FAIL',
        error: error.message,
        timestamp: new Date().toISOString()
      };

      this.log(`❌ 测试失败: ${testName} - ${error.message}`, 'error');
      this.results.errors.push(testResult);
      return testResult;
    }
  }

  async verifyDatabaseSchema() {
    this.log('🔍 验证数据库结构...');

    // 测试 categories 表结构
    const categoriesSchemaTest = await this.runTest('Categories 表结构', async () => {
      const result = await this.pool.query(`
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns 
        WHERE table_name = 'categories'
        ORDER BY ordinal_position
      `);

      const columns = result.rows.reduce((acc, row) => {
        acc[row.column_name] = {
          type: row.data_type,
          nullable: row.is_nullable === 'YES',
          default: row.column_default
        };
        return acc;
      }, {});

      // 检查必需字段
      const requiredFields = ['id', 'name', 'parent_id', 'level', 'sort_order', 'is_active'];
      const missingFields = requiredFields.filter(field => !columns[field]);
      
      if (missingFields.length > 0) {
        throw new Error(`Categories 表缺少字段: ${missingFields.join(', ')}`);
      }

      return { columns, fieldCount: Object.keys(columns).length };
    });

    this.results.schemaTests.push(categoriesSchemaTest);

    // 测试 audios 表结构
    const audiosSchemaTest = await this.runTest('Audios 表结构', async () => {
      const result = await this.pool.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'audios' 
        AND column_name IN ('category_id', 'subcategory_id')
      `);

      const newFields = result.rows.map(row => row.column_name);
      const requiredFields = ['category_id', 'subcategory_id'];
      const missingFields = requiredFields.filter(field => !newFields.includes(field));

      if (missingFields.length > 0) {
        throw new Error(`Audios 表缺少字段: ${missingFields.join(', ')}`);
      }

      return { newFields };
    });

    this.results.schemaTests.push(audiosSchemaTest);

    // 测试外键约束
    const constraintsTest = await this.runTest('外键约束', async () => {
      const result = await this.pool.query(`
        SELECT constraint_name, table_name, column_name, foreign_table_name, foreign_column_name
        FROM information_schema.key_column_usage kcu
        JOIN information_schema.referential_constraints rc ON kcu.constraint_name = rc.constraint_name
        JOIN information_schema.key_column_usage fkcu ON rc.unique_constraint_name = fkcu.constraint_name
        WHERE kcu.table_name IN ('categories', 'audios')
        AND kcu.constraint_name LIKE 'fk_%'
      `);

      const constraints = result.rows.map(row => ({
        name: row.constraint_name,
        table: row.table_name,
        column: row.column_name,
        foreignTable: row.foreign_table_name,
        foreignColumn: row.foreign_column_name
      }));

      const expectedConstraints = ['fk_categories_parent', 'fk_audios_category', 'fk_audios_subcategory'];
      const existingConstraints = constraints.map(c => c.name);
      const missingConstraints = expectedConstraints.filter(c => !existingConstraints.includes(c));

      if (missingConstraints.length > 0) {
        throw new Error(`缺少外键约束: ${missingConstraints.join(', ')}`);
      }

      return { constraints };
    });

    this.results.schemaTests.push(constraintsTest);

    // 测试索引
    const indexesTest = await this.runTest('数据库索引', async () => {
      const result = await this.pool.query(`
        SELECT indexname, tablename, indexdef
        FROM pg_indexes 
        WHERE tablename IN ('categories', 'audios')
        AND indexname LIKE 'idx_%'
      `);

      const indexes = result.rows.map(row => ({
        name: row.indexname,
        table: row.tablename,
        definition: row.indexdef
      }));

      return { indexes, count: indexes.length };
    });

    this.results.schemaTests.push(indexesTest);
  }

  async verifyDataIntegrity() {
    this.log('📊 验证数据完整性...');

    // 测试分类数据
    const categoriesDataTest = await this.runTest('分类数据完整性', async () => {
      const stats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_categories,
          COUNT(CASE WHEN level = 1 THEN 1 END) as level1_count,
          COUNT(CASE WHEN level = 2 THEN 1 END) as level2_count,
          COUNT(CASE WHEN is_active = true THEN 1 END) as active_count,
          COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as root_categories,
          COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as child_categories
        FROM categories
      `);

      const data = stats.rows[0];
      
      // 验证数据逻辑
      if (parseInt(data.level1_count) !== parseInt(data.root_categories)) {
        throw new Error('一级分类数量与根分类数量不匹配');
      }

      if (parseInt(data.level2_count) !== parseInt(data.child_categories)) {
        throw new Error('二级分类数量与子分类数量不匹配');
      }

      return data;
    });

    this.results.dataTests.push(categoriesDataTest);

    // 测试音频分类关联
    const audiosCategoryTest = await this.runTest('音频分类关联', async () => {
      const stats = await this.pool.query(`
        SELECT 
          COUNT(*) as total_audios,
          COUNT(CASE WHEN category_id IS NOT NULL THEN 1 END) as with_category,
          COUNT(CASE WHEN subcategory_id IS NOT NULL THEN 1 END) as with_subcategory,
          COUNT(CASE WHEN subject IS NOT NULL THEN 1 END) as with_subject
        FROM audios
      `);

      return stats.rows[0];
    });

    this.results.dataTests.push(audiosCategoryTest);

    // 测试数据一致性
    const consistencyTest = await this.runTest('数据一致性', async () => {
      // 检查无效的分类引用
      const invalidCategories = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM audios a
        LEFT JOIN categories c ON a.category_id = c.id
        WHERE a.category_id IS NOT NULL AND c.id IS NULL
      `);

      const invalidSubcategories = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM audios a
        LEFT JOIN categories c ON a.subcategory_id = c.id
        WHERE a.subcategory_id IS NOT NULL AND c.id IS NULL
      `);

      // 检查层级关系错误
      const invalidHierarchy = await this.pool.query(`
        SELECT COUNT(*) as count
        FROM categories c1
        JOIN categories c2 ON c1.parent_id = c2.id
        WHERE c1.level <= c2.level
      `);

      const issues = {
        invalidCategoryRefs: parseInt(invalidCategories.rows[0].count),
        invalidSubcategoryRefs: parseInt(invalidSubcategories.rows[0].count),
        invalidHierarchy: parseInt(invalidHierarchy.rows[0].count)
      };

      const totalIssues = Object.values(issues).reduce((sum, count) => sum + count, 0);
      
      if (totalIssues > 0) {
        throw new Error(`发现 ${totalIssues} 个数据一致性问题: ${JSON.stringify(issues)}`);
      }

      return issues;
    });

    this.results.dataTests.push(consistencyTest);
  }

  async verifyFunctionality() {
    this.log('⚙️ 验证功能完整性...');

    // 测试分类树构建
    const categoryTreeTest = await this.runTest('分类树构建', async () => {
      const categories = await this.pool.query(`
        SELECT id, name, parent_id, level, sort_order
        FROM categories 
        WHERE is_active = true
        ORDER BY level, sort_order, name
      `);

      const flatCategories = categories.rows;
      
      // 构建分类树
      const rootCategories = flatCategories.filter(cat => cat.parent_id === null);
      const tree = rootCategories.map(root => ({
        ...root,
        children: flatCategories.filter(cat => cat.parent_id === root.id)
      }));

      return {
        totalCategories: flatCategories.length,
        rootCategories: rootCategories.length,
        treeNodes: tree.length,
        maxDepth: Math.max(...tree.map(node => node.children.length > 0 ? 2 : 1))
      };
    });

    this.results.functionalTests.push(categoryTreeTest);

    // 测试分类查询性能
    const performanceTest = await this.runTest('查询性能', async () => {
      const startTime = Date.now();
      
      // 执行复杂查询
      await this.pool.query(`
        SELECT 
          c1.id, c1.name, c1.level,
          c2.name as parent_name,
          COUNT(a.id) as audio_count
        FROM categories c1
        LEFT JOIN categories c2 ON c1.parent_id = c2.id
        LEFT JOIN audios a ON (c1.id = a.category_id OR c1.id = a.subcategory_id)
        WHERE c1.is_active = true
        GROUP BY c1.id, c1.name, c1.level, c2.name
        ORDER BY c1.level, c1.sort_order
      `);

      const duration = Date.now() - startTime;
      
      if (duration > 1000) {
        throw new Error(`查询性能较差: ${duration}ms`);
      }

      return { duration };
    });

    this.results.functionalTests.push(performanceTest);

    // 测试迁移日志
    const migrationLogTest = await this.runTest('迁移日志', async () => {
      const logs = await this.pool.query(`
        SELECT migration_name, executed_at, status
        FROM migration_logs 
        WHERE migration_name LIKE '%category-hierarchy%'
        ORDER BY executed_at DESC
      `);

      if (logs.rows.length === 0) {
        throw new Error('未找到迁移日志记录');
      }

      const latestLog = logs.rows[0];
      if (latestLog.status !== 'SUCCESS') {
        throw new Error(`最新迁移状态异常: ${latestLog.status}`);
      }

      return {
        logCount: logs.rows.length,
        latestMigration: latestLog
      };
    });

    this.results.functionalTests.push(migrationLogTest);
  }

  generateReport() {
    const allTests = [
      ...this.results.schemaTests,
      ...this.results.dataTests,
      ...this.results.functionalTests
    ];

    const passedTests = allTests.filter(test => test.status === 'PASS');
    const failedTests = allTests.filter(test => test.status === 'FAIL');

    const report = {
      summary: {
        totalTests: allTests.length,
        passed: passedTests.length,
        failed: failedTests.length,
        successRate: `${((passedTests.length / allTests.length) * 100).toFixed(1)}%`
      },
      schemaTests: this.results.schemaTests,
      dataTests: this.results.dataTests,
      functionalTests: this.results.functionalTests,
      errors: this.results.errors,
      timestamp: new Date().toISOString()
    };

    // 保存报告到文件
    const reportPath = path.join(__dirname, `verification-report-${Date.now()}.json`);
    
    try {
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
      this.log(`📄 验证报告已生成: ${reportPath}`);
    } catch (error) {
      this.log(`⚠️ 生成验证报告失败: ${error.message}`, 'warn');
    }

    return report;
  }

  async run() {
    try {
      this.log('🚀 开始分类层级功能迁移验证...');

      await this.verifyDatabaseSchema();
      await this.verifyDataIntegrity();
      await this.verifyFunctionality();

      const report = this.generateReport();

      if (report.summary.failed === 0) {
        this.log('🎉 所有验证测试通过！迁移成功完成。', 'success');
        this.log(`📊 测试结果: ${report.summary.passed}/${report.summary.totalTests} 通过 (${report.summary.successRate})`);
      } else {
        this.log(`⚠️ 验证完成，但有 ${report.summary.failed} 个测试失败`, 'warn');
        this.log(`📊 测试结果: ${report.summary.passed}/${report.summary.totalTests} 通过 (${report.summary.successRate})`);
        
        this.log('❌ 失败的测试:');
        report.errors.forEach(error => {
          this.log(`   - ${error.name}: ${error.error}`, 'error');
        });
      }

      return report;

    } catch (error) {
      this.log(`❌ 验证过程失败: ${error.message}`, 'error');
      throw error;
    } finally {
      await this.pool.end();
    }
  }
}

// 主程序
if (require.main === module) {
  const verifier = new MigrationVerifier();
  verifier.run().catch(error => {
    console.error('验证脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = MigrationVerifier;