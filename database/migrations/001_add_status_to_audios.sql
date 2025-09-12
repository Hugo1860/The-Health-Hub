-- 为audios表添加status字段的迁移脚本

-- 检查status字段是否已存在，如果不存在则添加
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audios' 
        AND column_name = 'status'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE audios 
        ADD COLUMN status VARCHAR(20) DEFAULT 'draft' 
        CHECK (status IN ('draft', 'published', 'archived'));
        
        RAISE NOTICE 'Added status column to audios table';
    ELSE
        RAISE NOTICE 'Status column already exists in audios table';
    END IF;
END $$;