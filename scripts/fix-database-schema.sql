-- 修复数据库结构 SQL 脚本
-- 添加分类层级功能所需的字段

-- 开始事务
BEGIN;

-- 检查并添加 categories 表的缺失字段
DO $$ 
BEGIN
    -- 添加 parent_id 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'parent_id') THEN
        ALTER TABLE categories ADD COLUMN parent_id VARCHAR(255) DEFAULT NULL;
        RAISE NOTICE '✅ 添加字段: parent_id';
    ELSE
        RAISE NOTICE '✅ parent_id 字段已存在';
    END IF;

    -- 添加 level 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'level') THEN
        ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1 NOT NULL;
        RAISE NOTICE '✅ 添加字段: level';
    ELSE
        RAISE NOTICE '✅ level 字段已存在';
    END IF;

    -- 添加 sort_order 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'sort_order') THEN
        ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0 NOT NULL;
        RAISE NOTICE '✅ 添加字段: sort_order';
    ELSE
        RAISE NOTICE '✅ sort_order 字段已存在';
    END IF;

    -- 添加 is_active 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'is_active') THEN
        ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE NOT NULL;
        RAISE NOTICE '✅ 添加字段: is_active';
    ELSE
        RAISE NOTICE '✅ is_active 字段已存在';
    END IF;

    -- 添加 color 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'color') THEN
        ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT '#6b7280';
        RAISE NOTICE '✅ 添加字段: color';
    ELSE
        RAISE NOTICE '✅ color 字段已存在';
    END IF;

    -- 添加 icon 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'categories' AND column_name = 'icon') THEN
        ALTER TABLE categories ADD COLUMN icon VARCHAR(10) DEFAULT '📂';
        RAISE NOTICE '✅ 添加字段: icon';
    ELSE
        RAISE NOTICE '✅ icon 字段已存在';
    END IF;
END $$;

-- 检查并添加 audios 表的分类字段
DO $$ 
BEGIN
    -- 添加 category_id 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audios' AND column_name = 'category_id') THEN
        ALTER TABLE audios ADD COLUMN category_id VARCHAR(255);
        RAISE NOTICE '✅ 添加 audios 字段: category_id';
    ELSE
        RAISE NOTICE '✅ audios.category_id 字段已存在';
    END IF;

    -- 添加 subcategory_id 字段
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audios' AND column_name = 'subcategory_id') THEN
        ALTER TABLE audios ADD COLUMN subcategory_id VARCHAR(255);
        RAISE NOTICE '✅ 添加 audios 字段: subcategory_id';
    ELSE
        RAISE NOTICE '✅ audios.subcategory_id 字段已存在';
    END IF;
END $$;

-- 添加约束和索引
DO $$ 
BEGIN
    -- 添加层级检查约束
    BEGIN
        ALTER TABLE categories ADD CONSTRAINT chk_category_level CHECK (level IN (1, 2));
        RAISE NOTICE '✅ 添加约束: chk_category_level';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE '✅ 约束 chk_category_level 已存在';
    END;

    -- 添加层级一致性约束
    BEGIN
        ALTER TABLE categories ADD CONSTRAINT chk_category_hierarchy 
        CHECK (
            (level = 1 AND parent_id IS NULL) OR 
            (level = 2 AND parent_id IS NOT NULL)
        );
        RAISE NOTICE '✅ 添加约束: chk_category_hierarchy';
    EXCEPTION WHEN duplicate_object THEN
        RAISE NOTICE '✅ 约束 chk_category_hierarchy 已存在';
    END;
END $$;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX IF NOT EXISTS idx_categories_sort ON categories(parent_id, sort_order);

CREATE INDEX IF NOT EXISTS idx_audios_category ON audios(category_id);
CREATE INDEX IF NOT EXISTS idx_audios_subcategory ON audios(subcategory_id);

RAISE NOTICE '✅ 索引创建完成';

-- 初始化现有数据
UPDATE categories 
SET level = 1, sort_order = 0, is_active = TRUE 
WHERE level IS NULL OR level = 0;

-- 获取更新统计
DO $$ 
DECLARE
    category_count INTEGER;
    updated_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO category_count FROM categories;
    
    RAISE NOTICE '📊 当前分类总数: %', category_count;
    
    -- 如果没有分类，创建一些默认分类
    IF category_count = 0 THEN
        RAISE NOTICE '🎯 创建默认分类...';
        
        INSERT INTO categories (id, name, description, color, icon, level, sort_order, is_active, created_at, updated_at) VALUES
        ('cat_cardiology', '心血管', '心血管疾病相关内容', '#ef4444', '❤️', 1, 0, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('cat_neurology', '神经科', '神经系统疾病相关内容', '#8b5cf6', '🧠', 1, 1, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('cat_internal', '内科学', '内科疾病相关内容', '#10b981', '🏥', 1, 2, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('cat_surgery', '外科', '外科手术相关内容', '#f59e0b', '🔬', 1, 3, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
        ('cat_pediatrics', '儿科', '儿童疾病相关内容', '#3b82f6', '👶', 1, 4, TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);
        
        RAISE NOTICE '✅ 创建了 5 个默认分类';
    END IF;
END $$;

-- 提交事务
COMMIT;

-- 最终验证
DO $$ 
DECLARE
    final_count INTEGER;
    column_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO final_count FROM categories;
    
    SELECT COUNT(*) INTO column_count 
    FROM information_schema.columns 
    WHERE table_name = 'categories' 
    AND column_name IN ('parent_id', 'level', 'sort_order', 'is_active', 'color', 'icon');
    
    RAISE NOTICE '🎉 数据库结构修复完成！';
    RAISE NOTICE '📊 最终分类数量: %', final_count;
    RAISE NOTICE '🏗️ 层级字段数量: %/6', column_count;
    
    IF column_count = 6 THEN
        RAISE NOTICE '✅ 所有必需字段已添加';
    ELSE
        RAISE NOTICE '⚠️ 部分字段可能添加失败，请检查日志';
    END IF;
END $$;