-- 监控系统数据库架构
-- PostgreSQL版本

-- 监控记录表
CREATE TABLE IF NOT EXISTS monitoring_records (
    id VARCHAR(255) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    source VARCHAR(100) NOT NULL,
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'degraded', 'unhealthy')),
    metrics JSONB NOT NULL,
    metadata JSONB NOT NULL,
    response_time INTEGER NOT NULL,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 告警表
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(255) PRIMARY KEY,
    level VARCHAR(20) NOT NULL CHECK (level IN ('info', 'warning', 'error', 'critical')),
    title VARCHAR(500) NOT NULL,
    message TEXT NOT NULL,
    source VARCHAR(100) NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    resolved_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 告警规则表
CREATE TABLE IF NOT EXISTS alert_rules (
    id VARCHAR(255) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    source VARCHAR(100) NOT NULL,
    condition JSONB NOT NULL,
    threshold REAL NOT NULL,
    duration INTEGER NOT NULL,
    severity VARCHAR(20) NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    enabled BOOLEAN DEFAULT TRUE,
    notifications JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 监控配置表
CREATE TABLE IF NOT EXISTS monitoring_configs (
    id VARCHAR(255) PRIMARY KEY,
    source VARCHAR(100) NOT NULL UNIQUE,
    interval INTEGER NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    thresholds JSONB NOT NULL,
    retention_days INTEGER DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 监控聚合统计表（用于快速查询统计数据）
CREATE TABLE IF NOT EXISTS monitoring_aggregates (
    id SERIAL PRIMARY KEY,
    source VARCHAR(100) NOT NULL,
    date DATE NOT NULL,
    hour INTEGER NOT NULL CHECK (hour >= 0 AND hour <= 23),
    total_records INTEGER DEFAULT 0,
    healthy_records INTEGER DEFAULT 0,
    degraded_records INTEGER DEFAULT 0,
    unhealthy_records INTEGER DEFAULT 0,
    avg_response_time REAL DEFAULT 0,
    max_response_time INTEGER DEFAULT 0,
    min_response_time INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source, date, hour)
);

-- 创建索引
-- 监控记录表索引
CREATE INDEX IF NOT EXISTS idx_monitoring_records_timestamp ON monitoring_records(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_records_source ON monitoring_records(source, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_records_status ON monitoring_records(status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_records_source_status ON monitoring_records(source, status, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_records_response_time ON monitoring_records(response_time);

-- 告警表索引
CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON alerts(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_source ON alerts(source, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_resolved ON alerts(resolved, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_level ON alerts(level, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_source_resolved ON alerts(source, resolved, timestamp DESC);

-- 告警规则表索引
CREATE INDEX IF NOT EXISTS idx_alert_rules_source ON alert_rules(source);
CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled);
CREATE INDEX IF NOT EXISTS idx_alert_rules_source_enabled ON alert_rules(source, enabled);

-- 监控配置表索引
CREATE INDEX IF NOT EXISTS idx_monitoring_configs_source ON monitoring_configs(source);
CREATE INDEX IF NOT EXISTS idx_monitoring_configs_enabled ON monitoring_configs(enabled);

-- 监控聚合统计表索引
CREATE INDEX IF NOT EXISTS idx_monitoring_aggregates_source_date ON monitoring_aggregates(source, date DESC);
CREATE INDEX IF NOT EXISTS idx_monitoring_aggregates_date_hour ON monitoring_aggregates(date, hour);

-- 创建触发器函数用于更新updated_at字段
CREATE OR REPLACE FUNCTION update_monitoring_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 为需要的表创建更新时间触发器
CREATE TRIGGER update_alert_rules_updated_at 
    BEFORE UPDATE ON alert_rules
    FOR EACH ROW EXECUTE FUNCTION update_monitoring_updated_at_column();

CREATE TRIGGER update_monitoring_configs_updated_at 
    BEFORE UPDATE ON monitoring_configs
    FOR EACH ROW EXECUTE FUNCTION update_monitoring_updated_at_column();

CREATE TRIGGER update_monitoring_aggregates_updated_at 
    BEFORE UPDATE ON monitoring_aggregates
    FOR EACH ROW EXECUTE FUNCTION update_monitoring_updated_at_column();

-- 创建聚合统计函数
CREATE OR REPLACE FUNCTION update_monitoring_aggregates()
RETURNS TRIGGER AS $$
DECLARE
    record_date DATE;
    record_hour INTEGER;
BEGIN
    -- 提取日期和小时
    record_date := NEW.timestamp::DATE;
    record_hour := EXTRACT(HOUR FROM NEW.timestamp);
    
    -- 插入或更新聚合统计
    INSERT INTO monitoring_aggregates (
        source, date, hour, total_records, healthy_records, degraded_records, 
        unhealthy_records, avg_response_time, max_response_time, min_response_time
    ) VALUES (
        NEW.source, record_date, record_hour, 1,
        CASE WHEN NEW.status = 'healthy' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'degraded' THEN 1 ELSE 0 END,
        CASE WHEN NEW.status = 'unhealthy' THEN 1 ELSE 0 END,
        NEW.response_time, NEW.response_time, NEW.response_time
    )
    ON CONFLICT (source, date, hour) DO UPDATE SET
        total_records = monitoring_aggregates.total_records + 1,
        healthy_records = monitoring_aggregates.healthy_records + 
            CASE WHEN NEW.status = 'healthy' THEN 1 ELSE 0 END,
        degraded_records = monitoring_aggregates.degraded_records + 
            CASE WHEN NEW.status = 'degraded' THEN 1 ELSE 0 END,
        unhealthy_records = monitoring_aggregates.unhealthy_records + 
            CASE WHEN NEW.status = 'unhealthy' THEN 1 ELSE 0 END,
        avg_response_time = (
            (monitoring_aggregates.avg_response_time * monitoring_aggregates.total_records + NEW.response_time) / 
            (monitoring_aggregates.total_records + 1)
        ),
        max_response_time = GREATEST(monitoring_aggregates.max_response_time, NEW.response_time),
        min_response_time = LEAST(monitoring_aggregates.min_response_time, NEW.response_time),
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ language 'plpgsql';

-- 创建触发器用于自动更新聚合统计
CREATE TRIGGER trigger_update_monitoring_aggregates
    AFTER INSERT ON monitoring_records
    FOR EACH ROW EXECUTE FUNCTION update_monitoring_aggregates();

-- 创建清理过期数据的函数
CREATE OR REPLACE FUNCTION cleanup_expired_monitoring_data()
RETURNS INTEGER AS $$
DECLARE
    config_record RECORD;
    cutoff_date TIMESTAMP WITH TIME ZONE;
    deleted_count INTEGER := 0;
    total_deleted INTEGER := 0;
BEGIN
    -- 清理监控记录
    FOR config_record IN SELECT source, retention_days FROM monitoring_configs WHERE enabled = TRUE LOOP
        cutoff_date := CURRENT_TIMESTAMP - (config_record.retention_days || ' days')::INTERVAL;
        
        DELETE FROM monitoring_records 
        WHERE source = config_record.source AND timestamp < cutoff_date;
        
        GET DIAGNOSTICS deleted_count = ROW_COUNT;
        total_deleted := total_deleted + deleted_count;
        
        IF deleted_count > 0 THEN
            RAISE NOTICE 'Cleaned up % expired monitoring records for source: %', deleted_count, config_record.source;
        END IF;
    END LOOP;
    
    -- 清理已解决的旧告警（保留30天）
    cutoff_date := CURRENT_TIMESTAMP - INTERVAL '30 days';
    DELETE FROM alerts WHERE resolved = TRUE AND resolved_at < cutoff_date;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Cleaned up % old resolved alerts', deleted_count;
    END IF;
    
    -- 清理旧的聚合统计（保留90天）
    cutoff_date := CURRENT_TIMESTAMP - INTERVAL '90 days';
    DELETE FROM monitoring_aggregates WHERE date < cutoff_date::DATE;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    total_deleted := total_deleted + deleted_count;
    
    IF deleted_count > 0 THEN
        RAISE NOTICE 'Cleaned up % old monitoring aggregates', deleted_count;
    END IF;
    
    RETURN total_deleted;
END;
$$ LANGUAGE plpgsql;

-- 创建获取监控统计的函数
CREATE OR REPLACE FUNCTION get_monitoring_stats(source_filter VARCHAR DEFAULT NULL)
RETURNS TABLE (
    total_records BIGINT,
    healthy_records BIGINT,
    degraded_records BIGINT,
    unhealthy_records BIGINT,
    total_alerts BIGINT,
    unresolved_alerts BIGINT,
    average_response_time NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COALESCE(SUM(mr_stats.total), 0) as total_records,
        COALESCE(SUM(CASE WHEN mr_stats.status = 'healthy' THEN mr_stats.total ELSE 0 END), 0) as healthy_records,
        COALESCE(SUM(CASE WHEN mr_stats.status = 'degraded' THEN mr_stats.total ELSE 0 END), 0) as degraded_records,
        COALESCE(SUM(CASE WHEN mr_stats.status = 'unhealthy' THEN mr_stats.total ELSE 0 END), 0) as unhealthy_records,
        COALESCE(alert_stats.total_alerts, 0) as total_alerts,
        COALESCE(alert_stats.unresolved_alerts, 0) as unresolved_alerts,
        COALESCE(AVG(mr_stats.avg_response_time), 0) as average_response_time
    FROM (
        SELECT 
            COUNT(*) as total,
            status,
            AVG(response_time) as avg_response_time
        FROM monitoring_records 
        WHERE (source_filter IS NULL OR source = source_filter)
        GROUP BY status
    ) mr_stats
    CROSS JOIN (
        SELECT 
            COUNT(*) as total_alerts,
            SUM(CASE WHEN resolved = FALSE THEN 1 ELSE 0 END) as unresolved_alerts
        FROM alerts
        WHERE (source_filter IS NULL OR source = source_filter)
    ) alert_stats;
END;
$$ LANGUAGE plpgsql;

-- 插入默认监控配置
INSERT INTO monitoring_configs (id, source, interval, enabled, thresholds, retention_days) VALUES
('config-database', 'database', 30000, TRUE, '{"responseTime": 5000, "connectionFailures": 3}', 30),
('config-memory', 'memory', 60000, TRUE, '{"usagePercentage": 85, "criticalPercentage": 95}', 7),
('config-environment', 'environment', 300000, TRUE, '{}', 30)
ON CONFLICT (source) DO NOTHING;

-- 插入默认告警规则
INSERT INTO alert_rules (id, name, source, condition, threshold, duration, severity, enabled, notifications) VALUES
('rule-db-response-time', 'Database Response Time Alert', 'database', '{"metric": "responseTime", "operator": "gt"}', 5000, 60000, 'warning', TRUE, '["email", "webhook"]'),
('rule-memory-usage', 'Memory Usage Alert', 'memory', '{"metric": "usagePercentage", "operator": "gt"}', 85, 300000, 'warning', TRUE, '["email"]'),
('rule-memory-critical', 'Critical Memory Usage Alert', 'memory', '{"metric": "usagePercentage", "operator": "gt"}', 95, 60000, 'critical', TRUE, '["email", "webhook"]'),
('rule-db-connection-failure', 'Database Connection Failure', 'database', '{"metric": "status", "operator": "eq", "value": "unhealthy"}', 1, 0, 'error', TRUE, '["email", "webhook"]')
ON CONFLICT (id) DO NOTHING;