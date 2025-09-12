-- 分类层级功能回滚脚本
-- 版本: 001_rollback
-- 描述: 回滚分类层级功能的数据库更改

-- 开始事务
BEGIN;

-- 1. 删除索引
DROP INDEX IF EXISTS idx_categories_parent;
DROP INDEX IF EXISTS idx_categories_level;
DROP INDEX IF EXISTS idx_categories_active;
DROP INDEX IF EXISTS idx_categories_sort;
DROP INDEX IF EXISTS idx_categories_hierarchy;
DROP INDEX IF EXISTS idx_categories_unique_name_level;

DROP INDEX IF EXISTS idx_audios_category;
DROP INDEX IF EXISTS idx_audios_subcategory;
DROP INDEX IF EXISTS idx_audios_categories;

-- 2. 删除外键约束
ALTER TABLE categories DROP CONSTRAINT IF EXISTS fk_categories_parent;
ALTER TABLE audios DROP CONSTRAINT IF EXISTS fk_audios_category;
ALTER TABLE audios DROP CONSTRAINT IF EXISTS fk_audios_subcategory;

-- 3. 删除检查约束
ALTER TABLE categories DROP CONSTRAINT IF EXISTS chk_category_hierarchy;

-- 4. 删除新增的列
ALTER TABLE categories DROP COLUMN IF EXISTS parent_id;
ALTER TABLE categories DROP COLUMN IF EXISTS level;
ALTER TABLE categories DROP COLUMN IF EXISTS sort_order;
ALTER TABLE categories DROP COLUMN IF EXISTS is_active;

ALTER TABLE audios DROP COLUMN IF EXISTS category_id;
ALTER TABLE audios DROP COLUMN IF EXISTS subcategory_id;

-- 提交事务
COMMIT;

-- 验证回滚结果
DO $$
BEGIN
    -- 检查列是否已删除
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'parent_id'
    ) THEN
        RAISE EXCEPTION '回滚失败：parent_id 列仍然存在';
    END IF;
    
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audios' AND column_name = 'category_id'
    ) THEN
        RAISE EXCEPTION '回滚失败：category_id 列仍然存在';
    END IF;
    
    RAISE NOTICE '数据库结构回滚成功';
END $$;