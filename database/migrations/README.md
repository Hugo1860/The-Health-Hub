# 分类层级功能数据库迁移

本目录包含了为健康音频平台添加二级分类功能的数据库迁移脚本。

## 迁移内容

### 数据库结构变更

1. **categories 表新增字段**：
   - `parent_id`: 父分类ID（VARCHAR(255)）
   - `level`: 分类层级（INTEGER，1或2）
   - `sort_order`: 排序顺序（INTEGER）
   - `is_active`: 是否激活（BOOLEAN）

2. **audios 表新增字段**：
   - `category_id`: 一级分类ID（VARCHAR(255)）
   - `subcategory_id`: 二级分类ID（VARCHAR(255)）

3. **新增索引**：
   - 分类层级相关索引
   - 音频分类关联索引
   - 性能优化索引

4. **外键约束**：
   - 分类父子关系约束
   - 音频分类关联约束

### 数据迁移

1. 将现有分类标记为一级分类
2. 基于音频的 `subject` 字段创建分类关联
3. 保持数据完整性和一致性

## 使用方法

### 方法一：使用便捷脚本（推荐）

```bash
# 执行完整迁移（包括备份、迁移、验证）
./scripts/run-category-migration.sh

# 仅验证迁移结果
./scripts/run-category-migration.sh --validate-only

# 回滚迁移
./scripts/run-category-migration.sh --rollback
```

### 方法二：使用 npm 脚本

```bash
# 执行迁移
npm run migrate:category-hierarchy

# 验证迁移
npm run validate:category-migration
```

### 方法三：手动执行 SQL

```bash
# 执行迁移
psql -h localhost -U hugo -d health_hub -f database/migrations/001_add_category_hierarchy.sql

# 回滚迁移
psql -h localhost -U hugo -d health_hub -f database/migrations/001_add_category_hierarchy_rollback.sql
```

## 环境配置

确保以下环境变量已正确设置（在 `.env.local` 文件中）：

```env
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=health_hub
DB_USERNAME=hugo
DB_PASSWORD=your_password
DB_SSL=false
```

## 迁移前检查

1. **数据库连接**：确保能够连接到 PostgreSQL 数据库
2. **权限检查**：确保数据库用户有足够的权限执行 DDL 操作
3. **数据备份**：建议在迁移前备份重要数据
4. **磁盘空间**：确保有足够的磁盘空间存储新的索引

## 迁移后验证

迁移完成后，系统会自动执行以下验证：

1. **结构验证**：检查所有新增字段和索引是否正确创建
2. **数据一致性**：验证分类层级关系的正确性
3. **关联完整性**：检查音频与分类的关联是否正确
4. **性能测试**：测试关键查询的性能表现

## 回滚说明

如果迁移出现问题，可以使用回滚脚本恢复到迁移前的状态：

```bash
# 使用便捷脚本回滚
./scripts/run-category-migration.sh --rollback

# 或直接执行回滚 SQL
psql -h localhost -U hugo -d health_hub -f database/migrations/001_add_category_hierarchy_rollback.sql
```

**注意**：回滚会删除所有新增的字段和数据，请谨慎操作。

## 故障排除

### 常见问题

1. **权限不足**
   ```
   ERROR: permission denied for table categories
   ```
   解决：确保数据库用户有 ALTER TABLE 权限

2. **外键约束冲突**
   ```
   ERROR: insert or update on table violates foreign key constraint
   ```
   解决：检查数据完整性，清理无效的关联数据

3. **重复索引**
   ```
   ERROR: relation "idx_categories_parent" already exists
   ```
   解决：索引已存在，可以忽略或先删除再创建

4. **连接超时**
   ```
   ERROR: connection timed out
   ```
   解决：检查网络连接和数据库服务状态

### 日志查看

迁移过程中的详细日志会输出到控制台，包括：
- 执行步骤
- 数据统计
- 错误信息
- 性能指标

## 性能影响

### 迁移期间

- 预计迁移时间：1-5分钟（取决于数据量）
- 数据库会短暂锁定相关表
- 建议在低峰期执行

### 迁移后

- 新增索引会占用额外存储空间
- 查询性能会有所提升
- 写入操作可能略有影响（由于额外的索引维护）

## 联系支持

如果在迁移过程中遇到问题，请：

1. 查看控制台输出的错误信息
2. 检查数据库日志
3. 参考本文档的故障排除部分
4. 联系开发团队获取支持