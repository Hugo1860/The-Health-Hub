-- 分类层级功能数据库迁移脚本
-- 版本: 001
-- 描述: 为 categories 表添加层级支持字段，为 audios 表添加新的分类关联字段

-- ============================================================================
-- 第一阶段：为 categories 表添加层级支持字段
-- ============================================================================

-- 检查并添加 parent_id 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE categories ADD COLUMN parent_id VARCHAR(255) DEFAULT NULL;
        COMMENT ON COLUMN categories.parent_id IS '父分类ID，NULL表示一级分类';
    END IF;
END $$;

-- 检查并添加 level 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'level'
    ) THEN
        ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1 CHECK (level IN (1, 2));
        COMMENT ON COLUMN categories.level IS '分类层级：1=一级分类，2=二级分类';
    END IF;
END $$;

-- 检查并添加 sort_order 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'sort_order'
    ) THEN
        ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;
        COMMENT ON COLUMN categories.sort_order IS '排序顺序，数字越小越靠前';
    END IF;
END $$;

-- 检查并添加 is_active 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
        COMMENT ON COLUMN categories.is_active IS '是否激活状态';
    END IF;
END $$;

-- 检查并添加 description 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'description'
    ) THEN
        ALTER TABLE categories ADD COLUMN description TEXT DEFAULT '';
        COMMENT ON COLUMN categories.description IS '分类描述';
    END IF;
END $$;

-- 检查并添加 color 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'color'
    ) THEN
        ALTER TABLE categories ADD COLUMN color VARCHAR(7) DEFAULT '#6b7280';
        COMMENT ON COLUMN categories.color IS '分类颜色（十六进制）';
    END IF;
END $$;

-- 检查并添加 icon 字段（如果不存在）
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'categories' AND column_name = 'icon'
    ) THEN
        ALTER TABLE categories ADD COLUMN icon VARCHAR(10) DEFAULT '📂';
        COMMENT ON COLUMN categories.icon IS '分类图标（emoji或字符）';
    END IF;
END $$;

-- ============================================================================
-- 第二阶段：为 audios 表添加新的分类关联字段
-- ============================================================================

-- 检查并添加 category_id 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audios' AND column_name = 'category_id'
    ) THEN
        ALTER TABLE audios ADD COLUMN category_id VARCHAR(255) DEFAULT NULL;
        COMMENT ON COLUMN audios.category_id IS '一级分类ID';
    END IF;
END $$;

-- 检查并添加 subcategory_id 字段
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audios' AND column_name = 'subcategory_id'
    ) THEN
        ALTER TABLE audios ADD COLUMN subcategory_id VARCHAR(255) DEFAULT NULL;
        COMMENT ON COLUMN audios.subcategory_id IS '二级分类ID';
    END IF;
END $$;

-- ============================================================================
-- 第三阶段：添加外键约束和索引
-- ============================================================================

-- 添加 categories 表的外键约束
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_categories_parent'
    ) THEN
        ALTER TABLE categories ADD CONSTRAINT fk_categories_parent 
        FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 添加 audios 表的外键约束
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_audios_category'
    ) THEN
        ALTER TABLE audios ADD CONSTRAINT fk_audios_category 
        FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END $$;

DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'fk_audios_subcategory'
    ) THEN
        ALTER TABLE audios ADD CONSTRAINT fk_audios_subcategory 
        FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ============================================================================
-- 第四阶段：添加索引优化查询性能
-- ============================================================================

-- categories 表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_parent ON categories(parent_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_level ON categories(level);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_active ON categories(is_active);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_sort ON categories(parent_id, sort_order);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_categories_name ON categories(name);

-- audios 表索引
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audios_category ON audios(category_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audios_subcategory ON audios(subcategory_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audios_categories ON audios(category_id, subcategory_id);

-- ============================================================================
-- 第五阶段：数据迁移 - 将现有分类设置为一级分类
-- ============================================================================

-- 将所有现有分类设置为一级分类
UPDATE categories 
SET 
    level = 1,
    parent_id = NULL,
    is_active = TRUE,
    sort_order = COALESCE(sort_order, 0)
WHERE level IS NULL OR level != 1;

-- 为现有分类设置默认排序
WITH numbered_categories AS (
    SELECT id, ROW_NUMBER() OVER (ORDER BY name) - 1 as new_sort_order
    FROM categories 
    WHERE parent_id IS NULL AND sort_order = 0
)
UPDATE categories 
SET sort_order = nc.new_sort_order
FROM numbered_categories nc
WHERE categories.id = nc.id;

-- ============================================================================
-- 第六阶段：创建数据迁移日志表
-- ============================================================================

-- 创建迁移日志表（如果不存在）
CREATE TABLE IF NOT EXISTS migration_logs (
    id SERIAL PRIMARY KEY,
    migration_name VARCHAR(255) NOT NULL,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) DEFAULT 'SUCCESS',
    details TEXT,
    rollback_sql TEXT
);

-- 记录此次迁移
INSERT INTO migration_logs (migration_name, details, rollback_sql) 
VALUES (
    '001-add-category-hierarchy',
    '添加分类层级支持：parent_id, level, sort_order, is_active 字段；添加 audios 表的 category_id, subcategory_id 字段；添加相关索引和约束',
    '-- 回滚脚本在 001-rollback-category-hierarchy.sql 中'
);

-- ============================================================================
-- 完成迁移
-- ============================================================================

-- 输出迁移完成信息
DO $$ 
BEGIN
    RAISE NOTICE '✅ 分类层级功能数据库迁移完成！';
    RAISE NOTICE '📊 迁移内容：';
    RAISE NOTICE '   - categories 表添加层级支持字段';
    RAISE NOTICE '   - audios 表添加新的分类关联字段';
    RAISE NOTICE '   - 添加外键约束和性能索引';
    RAISE NOTICE '   - 现有数据迁移为一级分类';
    RAISE NOTICE '🔄 下一步：运行应用层数据迁移脚本';
END $$;