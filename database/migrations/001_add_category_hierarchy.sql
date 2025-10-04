-- 分类层级功能数据库迁移脚本
-- 版本: 001
-- 描述: 为 categories 表添加层级支持字段，为 audios 表添加新的分类关联字段

-- 开始事务
BEGIN;

-- 1. 为 categories 表添加层级支持字段
ALTER TABLE categories ADD COLUMN parent_id VARCHAR(255) DEFAULT NULL;
ALTER TABLE categories ADD COLUMN level INTEGER DEFAULT 1 CHECK (level IN (1, 2));
ALTER TABLE categories ADD COLUMN sort_order INTEGER DEFAULT 0;
ALTER TABLE categories ADD COLUMN is_active BOOLEAN DEFAULT TRUE;

-- 2. 为 audios 表添加新的分类关联字段
ALTER TABLE audios ADD COLUMN category_id VARCHAR(255);
ALTER TABLE audios ADD COLUMN subcategory_id VARCHAR(255);

-- 3. 添加外键约束
ALTER TABLE categories ADD CONSTRAINT fk_categories_parent 
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE CASCADE;

ALTER TABLE audios ADD CONSTRAINT fk_audios_category 
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL;

ALTER TABLE audios ADD CONSTRAINT fk_audios_subcategory 
  FOREIGN KEY (subcategory_id) REFERENCES categories(id) ON DELETE SET NULL;

-- 4. 添加检查约束确保数据一致性
ALTER TABLE categories ADD CONSTRAINT chk_category_hierarchy 
  CHECK (
    (level = 1 AND parent_id IS NULL) OR 
    (level = 2 AND parent_id IS NOT NULL)
  );

-- 5. 添加索引优化查询性能
CREATE INDEX idx_categories_parent ON categories(parent_id);
CREATE INDEX idx_categories_level ON categories(level);
CREATE INDEX idx_categories_active ON categories(is_active);
CREATE INDEX idx_categories_sort ON categories(parent_id, sort_order);
CREATE INDEX idx_categories_hierarchy ON categories(level, parent_id, sort_order);

CREATE INDEX idx_audios_category ON audios(category_id);
CREATE INDEX idx_audios_subcategory ON audios(subcategory_id);
CREATE INDEX idx_audios_categories ON audios(category_id, subcategory_id);

-- 6. 迁移现有数据
-- 将所有现有分类设置为一级分类
UPDATE categories SET level = 1, sort_order = 0, is_active = TRUE WHERE level IS NULL;

-- 为现有音频创建分类关联（基于 subject 字段）
UPDATE audios SET category_id = (
  SELECT c.id 
  FROM categories c 
  WHERE c.name = audios.subject 
    AND c.level = 1
  LIMIT 1
) WHERE subject IS NOT NULL AND category_id IS NULL;

-- 7. 添加唯一约束防止同层级重名
CREATE UNIQUE INDEX idx_categories_unique_name_level 
  ON categories(name, COALESCE(parent_id, '')) 
  WHERE is_active = TRUE;

-- 提交事务
COMMIT;

-- 验证迁移结果
DO $$
DECLARE
    category_count INTEGER;
    audio_migrated_count INTEGER;
BEGIN
    -- 检查分类表结构
    SELECT COUNT(*) INTO category_count FROM categories WHERE level = 1;
    RAISE NOTICE '一级分类数量: %', category_count;
    
    -- 检查音频迁移结果
    SELECT COUNT(*) INTO audio_migrated_count FROM audios WHERE category_id IS NOT NULL;
    RAISE NOTICE '已迁移音频数量: %', audio_migrated_count;
    
    -- 检查数据一致性
    IF EXISTS (SELECT 1 FROM categories WHERE level = 2 AND parent_id IS NULL) THEN
        RAISE EXCEPTION '数据不一致：发现二级分类没有父分类';
    END IF;
    
    IF EXISTS (SELECT 1 FROM categories WHERE level = 1 AND parent_id IS NOT NULL) THEN
        RAISE EXCEPTION '数据不一致：发现一级分类有父分类';
    END IF;
    
    RAISE NOTICE '数据迁移验证通过';
END $$;