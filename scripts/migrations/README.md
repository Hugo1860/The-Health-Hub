# 分类层级功能数据迁移指南

本目录包含了分类层级功能的完整数据迁移脚本和工具。

## 📋 迁移概述

分类层级功能为现有的分类系统添加了二级分类支持，包括：

- **数据库结构更新**：为 `categories` 表添加层级支持字段
- **新增分类关联**：为 `audios` 表添加新的分类关联字段
- **数据迁移**：将现有数据迁移到新的层级结构
- **向后兼容**：保持现有 API 和数据的兼容性

## 📁 文件结构

```
scripts/
├── migrations/
│   ├── 001-add-category-hierarchy.sql      # 数据库结构迁移脚本
│   ├── 001-rollback-category-hierarchy.sql # 回滚脚本
│   ├── migrate-category-data.js            # 应用数据迁移脚本
│   └── README.md                           # 本文档
├── run-migration.js                        # 迁移执行器
└── verify-migration.js                     # 迁移验证脚本
```

## 🚀 快速开始

### 1. 环境准备

确保已安装必要的依赖：

```bash
npm install pg readline
```

设置环境变量：

```bash
export DB_HOST=localhost
export DB_PORT=5432
export DB_DATABASE=health_hub
export DB_USERNAME=postgres
export DB_PASSWORD=your_password
export DB_SSL=false
```

### 2. 备份数据库

**⚠️ 重要：执行迁移前请务必备份数据库！**

```bash
pg_dump -h localhost -U postgres -d health_hub > backup_$(date +%Y%m%d_%H%M%S).sql
```

### 3. 检查迁移环境

```bash
node scripts/run-migration.js --dry-run
```

### 4. 执行迁移

```bash
node scripts/run-migration.js
```

### 5. 验证迁移结果

```bash
node scripts/verify-migration.js
```

## 📖 详细使用说明

### 迁移执行器 (run-migration.js)

主要的迁移工具，支持多种操作模式：

```bash
# 检查环境（不执行实际迁移）
node scripts/run-migration.js --dry-run

# 正常执行迁移（会要求用户确认）
node scripts/run-migration.js

# 强制执行迁移（跳过确认，生产环境慎用）
node scripts/run-migration.js --force

# 执行回滚操作
node scripts/run-migration.js --rollback

# 显示帮助信息
node scripts/run-migration.js --help
```

### 迁移验证器 (verify-migration.js)

验证迁移是否成功完成：

```bash
node scripts/verify-migration.js
```

验证内容包括：
- 数据库结构完整性
- 数据迁移完整性
- 功能可用性测试
- 性能基准测试

## 🔄 迁移流程

### 阶段 1：数据库结构迁移

执行 `001-add-category-hierarchy.sql` 脚本：

1. **添加 categories 表字段**：
   - `parent_id`: 父分类ID
   - `level`: 分类层级 (1=一级, 2=二级)
   - `sort_order`: 排序顺序
   - `is_active`: 激活状态
   - `description`: 分类描述
   - `color`: 分类颜色
   - `icon`: 分类图标

2. **添加 audios 表字段**：
   - `category_id`: 一级分类ID
   - `subcategory_id`: 二级分类ID

3. **添加约束和索引**：
   - 外键约束确保数据完整性
   - 性能索引优化查询速度

4. **初始数据设置**：
   - 将现有分类设置为一级分类
   - 设置默认排序和状态

### 阶段 2：应用数据迁移

执行 `migrate-category-data.js` 脚本：

1. **创建默认分类结构**：
   - 创建标准的医学分类体系
   - 为每个一级分类创建相应的二级分类

2. **迁移音频分类数据**：
   - 将音频的 `subject` 字段映射到新的 `category_id`
   - 智能匹配和分类归属

3. **数据验证**：
   - 检查数据完整性
   - 验证分类关联正确性

## 📊 默认分类结构

迁移脚本会创建以下默认分类结构：

```
心血管 (cardiology)
├── 高血压 (hypertension)
├── 冠心病 (coronary-heart-disease)
└── 心律失常 (arrhythmia)

神经科 (neurology)
├── 脑卒中 (stroke)
├── 癫痫 (epilepsy)
└── 痴呆 (dementia)

肿瘤科 (oncology)
├── 肺癌 (lung-cancer)
├── 乳腺癌 (breast-cancer)
└── 胃癌 (gastric-cancer)

... (更多分类)
```

## 🔧 自定义配置

### 修改默认分类

编辑 `migrate-category-data.js` 中的 `DEFAULT_CATEGORY_MAPPING` 对象：

```javascript
const DEFAULT_CATEGORY_MAPPING = {
  '自定义分类': {
    id: 'custom-category',
    name: '自定义分类',
    description: '自定义分类描述',
    color: '#ff6b6b',
    icon: '🏥',
    subcategories: [
      { id: 'sub1', name: '子分类1', description: '描述1' },
      { id: 'sub2', name: '子分类2', description: '描述2' }
    ]
  }
};
```

### 修改数据库配置

通过环境变量或直接修改脚本中的 `dbConfig` 对象。

## 🚨 故障排除

### 常见问题

1. **数据库连接失败**
   ```
   解决方案：检查数据库配置和网络连接
   ```

2. **权限不足**
   ```
   解决方案：确保数据库用户有 CREATE、ALTER、INSERT 权限
   ```

3. **表已存在相关字段**
   ```
   解决方案：脚本会自动检查并跳过已存在的字段
   ```

4. **外键约束冲突**
   ```
   解决方案：检查数据完整性，清理无效数据
   ```

### 回滚操作

如果迁移出现问题，可以执行回滚：

```bash
node scripts/run-migration.js --rollback
```

**⚠️ 注意：回滚会删除所有层级分类数据！**

### 手动回滚

如果自动回滚失败，可以手动执行：

```bash
psql -h localhost -U postgres -d health_hub -f scripts/migrations/001-rollback-category-hierarchy.sql
```

## 📈 性能考虑

### 索引优化

迁移脚本会自动创建以下索引：

- `idx_categories_parent`: 父分类查询
- `idx_categories_level`: 层级查询
- `idx_categories_active`: 状态查询
- `idx_audios_category`: 音频分类查询
- `idx_audios_subcategory`: 音频子分类查询

### 查询优化建议

1. **使用层级查询**：
   ```sql
   -- 获取分类树
   WITH RECURSIVE category_tree AS (
     SELECT *, 1 as depth FROM categories WHERE parent_id IS NULL
     UNION ALL
     SELECT c.*, ct.depth + 1 FROM categories c
     JOIN category_tree ct ON c.parent_id = ct.id
   )
   SELECT * FROM category_tree ORDER BY depth, sort_order;
   ```

2. **音频分类查询**：
   ```sql
   -- 按分类查询音频
   SELECT a.* FROM audios a
   JOIN categories c ON (a.category_id = c.id OR a.subcategory_id = c.id)
   WHERE c.name = '心血管';
   ```

## 🔍 监控和维护

### 迁移日志

所有迁移操作都会记录在 `migration_logs` 表中：

```sql
SELECT * FROM migration_logs 
WHERE migration_name LIKE '%category-hierarchy%'
ORDER BY executed_at DESC;
```

### 数据完整性检查

定期运行验证脚本：

```bash
# 每周运行一次
node scripts/verify-migration.js
```

### 性能监控

监控关键查询的性能：

```sql
-- 检查分类查询性能
EXPLAIN ANALYZE SELECT * FROM categories WHERE parent_id = 'cardiology';

-- 检查音频分类查询性能
EXPLAIN ANALYZE SELECT * FROM audios WHERE category_id = 'cardiology';
```

## 📞 支持和反馈

如果在迁移过程中遇到问题：

1. 检查迁移日志和错误信息
2. 运行验证脚本诊断问题
3. 查看生成的报告文件
4. 如有必要，执行回滚操作

## 📝 更新日志

- **v1.0.0** (2025-01-20): 初始版本，支持基本的分类层级迁移
- 支持数据库结构迁移
- 支持应用数据迁移
- 支持回滚操作
- 支持迁移验证

---

**⚠️ 重要提醒**：
- 生产环境执行前请充分测试
- 务必备份数据库
- 建议在维护窗口期间执行
- 执行后验证应用功能正常