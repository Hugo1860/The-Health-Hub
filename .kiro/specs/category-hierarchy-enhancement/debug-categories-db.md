# 分类数据库调试指南

## 问题描述

在 `admin/categories-db` 页面中看不到二级分类的内容，需要调试以下几个方面：

## 调试步骤

### 1. 检查数据库表结构

首先确认数据库表是否包含层级字段：

```sql
-- 检查 categories 表结构
\d categories;

-- 或者
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'categories' 
ORDER BY ordinal_position;
```

应该看到以下字段：
- `parent_id` (VARCHAR, nullable)
- `level` (INTEGER, default 1)
- `sort_order` (INTEGER, default 0)

### 2. 检查现有数据

```sql
-- 查看所有分类数据
SELECT id, name, parent_id, level, sort_order, is_active 
FROM categories 
ORDER BY level, sort_order, name;

-- 统计分类层级分布
SELECT level, COUNT(*) as count 
FROM categories 
GROUP BY level 
ORDER BY level;
```

### 3. 创建测试二级分类

如果没有二级分类数据，可以手动创建一些测试数据：

```sql
-- 为心血管分类创建二级分类
INSERT INTO categories (
  id, name, description, parent_id, level, sort_order, 
  color, icon, is_active, created_at, updated_at
) VALUES 
(
  'cardiology-hypertension', 
  '高血压', 
  '高血压相关内容', 
  'cardiology', 
  2, 
  1, 
  '#ef4444', 
  '💓', 
  true, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
),
(
  'cardiology-arrhythmia', 
  '心律失常', 
  '心律失常相关内容', 
  'cardiology', 
  2, 
  2, 
  '#ef4444', 
  '💗', 
  true, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
);

-- 为神经外科创建二级分类
INSERT INTO categories (
  id, name, description, parent_id, level, sort_order, 
  color, icon, is_active, created_at, updated_at
) VALUES 
(
  'neurology-stroke', 
  '脑卒中', 
  '脑卒中相关内容', 
  'neurology', 
  2, 
  1, 
  '#8b5cf6', 
  '🧠', 
  true, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
),
(
  'neurology-epilepsy', 
  '癫痫', 
  '癫痫相关内容', 
  'neurology', 
  2, 
  2, 
  '#8b5cf6', 
  '⚡', 
  true, 
  CURRENT_TIMESTAMP, 
  CURRENT_TIMESTAMP
);
```

### 4. 检查API响应

在浏览器开发者工具中检查API调用：

1. 打开 `admin/categories-db` 页面
2. 打开开发者工具的Network标签
3. 刷新页面
4. 查看 `/api/categories` 的响应

应该看到包含 `parentId` 和 `level` 字段的分类数据。

### 5. 检查前端组件

确认前端组件正确显示层级信息：

- 表格的"分类名称"列应该显示"一级"或"二级"标签
- "父分类"列应该显示父分类名称
- 统计信息应该显示正确的一级和二级分类数量

## 可能的问题和解决方案

### 问题1：数据库迁移未执行

**症状：** 数据库表中没有 `parent_id`、`level`、`sort_order` 字段

**解决方案：**
```bash
# 执行数据库迁移
psql $DATABASE_URL -f database/migrations/001_add_category_hierarchy.sql
```

### 问题2：没有二级分类数据

**症状：** 所有分类的 `level` 都是 1，`parent_id` 都是 NULL

**解决方案：** 使用上面的SQL语句创建测试二级分类数据

### 问题3：API不返回层级数据

**症状：** API响应中缺少 `parentId` 和 `level` 字段

**解决方案：** 检查 `src/lib/categoryQueries.ts` 中的查询是否正确映射字段

### 问题4：前端组件不显示层级信息

**症状：** 数据正确但界面不显示层级信息

**解决方案：** 检查 `src/app/admin/categories-db/page.tsx` 中的表格列定义

## 验证步骤

完成修复后，应该能看到：

1. 统计信息显示正确的一级和二级分类数量
2. 表格中的分类名称列显示"一级"或"二级"标签
3. 父分类列显示对应的父分类名称
4. 可以创建新的二级分类（选择父分类）

## 快速测试命令

```sql
-- 快速检查表结构
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns 
  WHERE table_name = 'categories' AND column_name = 'parent_id'
) as has_parent_id;

-- 快速检查数据
SELECT 
  COUNT(*) as total,
  COUNT(CASE WHEN level = 1 THEN 1 END) as level_1,
  COUNT(CASE WHEN level = 2 THEN 1 END) as level_2
FROM categories;
```