-- 清理 subject 字段脚本
-- 这个脚本将移除 audios 表中的 subject 字段
-- 在运行此脚本之前，请确保所有数据已迁移到新的分类字段

-- 开始事务
BEGIN;

-- 1. 检查数据迁移状态
DO $
DECLARE
    total_audios INTEGER;
    migrated_audios INTEGER;
    migration_rate NUMERIC;
BEGIN
    -- 统计总音频数和已迁移音频数
    SELECT COUNT(*) INTO total_audios FROM audios;
    SELECT COUNT(*) INTO migrated_audios FROM audios WHERE category_id IS NOT NULL;
    
    -- 计算迁移率
    IF total_audios > 0 THEN
        migration_rate := (migrated_audios::NUMERIC / total_audios::NUMERIC) * 100;
    ELSE
        migration_rate := 100;
    END IF;
    
    RAISE NOTICE '数据迁移状态检查:';
    RAISE NOTICE '  总音频数: %', total_audios;
    RAISE NOTICE '  已迁移音频数: %', migrated_audios;
    RAISE NOTICE '  迁移率: %%%', ROUND(migration_rate, 2);
    
    -- 如果迁移率低于90%，发出警告
    IF migration_rate < 90 THEN
        RAISE WARNING '迁移率低于90%%，建议先完成数据迁移再删除subject字段';
    END IF;
END $;

-- 2. 备份 subject 字段数据（可选）
-- 创建备份表
CREATE TABLE IF NOT EXISTS audios_subject_backup AS
SELECT id, title, subject, category_id, subcategory_id, upload_date
FROM audios
WHERE subject IS NOT NULL;

-- 记录备份信息
DO $
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count FROM audios_subject_backup;
    RAISE NOTICE '已备份 % 条包含subject字段的记录到 audios_subject_backup 表', backup_count;
END $;

-- 3. 显示将要删除的字段信息
DO $
DECLARE
    subject_count INTEGER;
    unique_subjects INTEGER;
BEGIN
    SELECT COUNT(*) INTO subject_count FROM audios WHERE subject IS NOT NULL;
    SELECT COUNT(DISTINCT subject) INTO unique_subjects FROM audios WHERE subject IS NOT NULL;
    
    RAISE NOTICE 'Subject字段使用情况:';
    RAISE NOTICE '  包含subject的音频数: %', subject_count;
    RAISE NOTICE '  唯一subject值数: %', unique_subjects;
END $;

-- 4. 删除 subject 字段（注释掉，需要手动确认后执行）
-- ALTER TABLE audios DROP COLUMN IF EXISTS subject;

-- 5. 清理相关索引（如果存在）
-- DROP INDEX IF EXISTS idx_audios_subject;

-- 提交事务（如果只是检查，不删除字段）
COMMIT;

-- 验证脚本
DO $
BEGIN
    -- 检查字段是否还存在
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'audios' AND column_name = 'subject'
    ) THEN
        RAISE NOTICE '✅ subject字段仍然存在（未删除）';
    ELSE
        RAISE NOTICE '🗑️ subject字段已被删除';
    END IF;
    
    -- 检查备份表
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'audios_subject_backup'
    ) THEN
        RAISE NOTICE '💾 备份表 audios_subject_backup 已创建';
    END IF;
END $;