# Database Seed

将需要初始化导入的 SQL 放在本目录：
- 任何以 `.sql` 或 `.sql.gz` 结尾的文件将会在容器首次启动时自动导入到 `${MYSQL_DATABASE}`。

建议文件：
- cloud-init-mysql.sql：基础表结构与最小数据
- sample-data.sql：示例数据（可选）
- backup-YYYYMMDD.sql.gz：你的生产/测试备份


