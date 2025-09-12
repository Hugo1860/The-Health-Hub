-- 分类层级功能数据库回滚脚本
-- 版本: 001-rollback
-- 描述: 回滚分类层级功能的数据库更改

-- ============================================================================
-- 警告：此脚本将删除分类层级功能的所有数据库更改
-- 请在执行前确保已备份数据！
-- ============================================================================

-- 开始事务
BEGIN;

-- ============================================================================
-- 第一阶段：删除外键约束
-- ============================================================================

-- 删除 audios 表的外键约束
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_audios_subcategory'
    ) THEN
        ALTER TABLE audios DROP CONSTRAINT fk_audios_subcategory;
        RAISE NOTICE '✅ 删除 fk_audios_subcategory 外键约束';
    END IF;
END $$;

DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_audios_category'
    ) THEN
        ALTER TABLE audios DROP CONSTRAINT fk_audios_category;
        RAISE NOTICE '✅ 删除 fk_audios_category 外键约束';
    END IF;
END $$;

-- 删除 categories 表的外键约束
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_categories_parent'
    ) THEN
        ALTER TABLE categories DROP CONSTRAINT fk_categories_parent;
        RAISE NOTICE '✅ 删除 fk_categories_parent 外键约束';
    END IF;
END $$;

-- ============================================================================
-- 第二阶段：删除索引
-- ============================================================================

-- 删除 audios 表索引
DROP INDEX CONCURRENTLY IF EXISTS idx_audios_categories;
DROP INDEX CONCURRENTLY IF EXISTS idx_audios_subcategory;
DROP INDEX CONCURRENTLY IF EXISTS idx_audios_category;

-- 删除 categories 表索引
DROP INDEX CONCURRENTLY IF EXISTS idx_categories_sort;
DROP INDEX CONCURRENTLY IF EXISTS idx_categories_active;
DROP INDEX CONCURRENTLY IF EXISTS idx_categories_level;
DROP INDEX CONCURRENTLY IF EXISTS idx_categories_parent;
DROP INDEX CONCURRENTLY IF EXISTS idx_categories_name;

RAISE NOTICE '✅ 删除所有相关索引';

-- ============================================================================
-- 第三阶段：删除 audios 表的新字段
-- ============================================================================

-- 删除 subcategory_id 字段
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audios' AND column_name = 'subcategory_id'
    ) THEN
        ALTER TABLE audios DROP COLUMN subcategory_id;
        RAISE NOTICE '✅ 删除 audios.subcategory_id 字段';
    END IF;
END $$;

-- 删除 category_id 字段
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audios' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE audios DROP COLUMN category_id;
        RAISE NOTICE '✅ 删除 audios.category_id 字段';
    END IF;
END $$;

-- ============================================================================
-- 第四阶段：删除 categories 表的层级字段
-- ============================================================================

-- 删除 is_active 字段
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE categories DROP COLUMN is_active;
        RAISE NOTICE '✅ 删除 categories.is_active 字段';
    END IF;
END $$;

-- 删除 sort_order 字段
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE categories DROP COLUMN sort_order;
        RAISE NOTICE '✅ 删除 categories.sort_order 字段';
    END IF;
END $$;

-- 删除 level 字段
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'level'
    ) THEN
        ALTER TABLE categories DROP COLUMN level;
        RAISE NOTICE '✅ 删除 categories.level 字段';
    END IF;
END $$;

-- 删除 parent_id 字段
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE categories DROP COLUMN parent_id;
        RAISE NOTICE '✅ 删除 categories.parent_id 字段';
    END IF;
END $$;

-- ============================================================================
-- 第五阶段：记录回滚日志
-- ============================================================================

-- 记录回滚操作
INSERT INTO migration_logs (migration_name, status, details) 
VALUES (
    '001-rollback-category-hierarchy',
    'ROLLBACK',
    '回滚分类层级功能：删除所有层级相关字段、约束和索引'
);

-- ============================================================================
-- 完成回滚
-- ============================================================================

-- 提交事务
COMMIT;

-- 输出回滚完成信息
DO $$ 
BEGIN
    RAISE NOTICE '✅ 分类层级功能数据库回滚完成！';
    RAISE NOTICE '📊 回滚内容：';
    RAISE NOTICE '   - 删除 categories 表的层级字段';
    RAISE NOTICE '   - 删除 audios 表的新分类字段';
    RAISE NOTICE '   - 删除所有相关约束和索引';
    RAISE NOTICE '⚠️  注意：请检查应用代码兼容性';
END $$;