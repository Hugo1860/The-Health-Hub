# 资源管理快速开始

## 🚀 快速使用指南

### 1. 整理现有文件

```bash
# 查看将要执行的操作（不实际移动文件）
node scripts/organize-files.js --dry-run --verbose

# 实际执行文件整理
node scripts/organize-files.js --verbose
```

### 2. 清理孤儿文件

```bash
# 查找孤儿文件（不实际删除）
node scripts/cleanup-orphan-files.js --dry-run --verbose

# 移动孤儿文件到回收站
node scripts/cleanup-orphan-files.js --verbose
```

### 3. 查看存储统计

访问管理后台：
```
http://localhost:3000/admin/resources
```

或通过 API：
```bash
curl http://localhost:3000/api/admin/storage/stats
```

---

## 📊 当前文件分布

运行以下命令查看文件分布：

```bash
# 统计各目录文件数量
find public/uploads/audios -type f | wc -l
find public/uploads/covers -type f | wc -l

# 统计各目录占用空间
du -sh public/uploads/audios
du -sh public/uploads/covers
du -sh public/uploads/*
```

---

## 🗑️ 清理回收站

```bash
# 查看回收站文件
ls -lh public/uploads/trash/

# 清空回收站（30天前的文件）
find public/uploads/trash -type f -mtime +30 -delete
```

---

## ⚙️ 环境变量配置

在 `.env` 文件中添加：

```env
# 存储配置
STORAGE_MAX_SIZE=53687091200  # 50GB
STORAGE_CLEANUP_THRESHOLD=0.8

# CDN 配置 (可选)
CDN_ENABLED=false
CDN_BASE_URL=https://cdn.yourdomain.com

# 备份配置
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
```

---

## 📝 定期维护任务

### 每日任务
- [ ] 检查存储空间使用率
- [ ] 清理临时文件

### 每周任务
- [ ] 运行孤儿文件检测
- [ ] 查看文件访问统计
- [ ] 执行增量备份

### 每月任务
- [ ] 执行完整备份
- [ ] 清理回收站
- [ ] 审查存储策略

---

## 🔧 故障排查

### 问题：文件上传失败

```bash
# 检查目录权限
ls -la public/uploads/

# 确保有写权限
chmod -R 755 public/uploads/
```

### 问题：存储空间不足

```bash
# 1. 查看存储使用情况
df -h

# 2. 找出大文件
find public/uploads -type f -size +50M -exec ls -lh {} \;

# 3. 清理孤儿文件
node scripts/cleanup-orphan-files.js

# 4. 清空回收站
rm -rf public/uploads/trash/*
```

### 问题：数据库与文件不同步

```bash
# 运行孤儿文件检测
node scripts/cleanup-orphan-files.js --dry-run --verbose
```

---

## 📚 相关文档

- [完整资源管理方案](./AUDIO_RESOURCE_MANAGEMENT_GUIDE.md)
- [上传文件说明](./UPLOAD_FILES_README.md)
- [部署指南](./DEPLOYMENT_GUIDE_UBUNTU.md)

---

## 💡 最佳实践

1. **每周检查孤儿文件** - 保持数据库与文件系统同步
2. **监控存储空间** - 在达到 80% 时设置告警
3. **定期备份** - 每天增量，每周完整
4. **使用 CDN** - 减轻服务器负载
5. **记录访问日志** - 优化存储策略

---

更新日期: 2025-01-04

