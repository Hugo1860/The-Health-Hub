# 音频文件资源管理方案

## 📋 目录
1. [当前状态分析](#当前状态分析)
2. [文件组织结构](#文件组织结构)
3. [存储策略](#存储策略)
4. [清理与维护](#清理与维护)
5. [备份方案](#备份方案)
6. [CDN 集成](#cdn-集成)
7. [管理界面](#管理界面)
8. [性能优化](#性能优化)
9. [实施步骤](#实施步骤)

---

## 🔍 当前状态分析

### 现有问题
```
public/uploads/
├── ❌ 音频文件散落在根目录 (历史遗留)
├── ✅ audios/         (新上传的音频，已规范)
├── ✅ covers/         (封面图片)
├── ❌ slides/         (PPT，未充分利用)
└── ❌ audio-list.json (冗余文件)
```

### 需要解决的问题
- [ ] 文件命名不统一
- [ ] 缺少文件索引和快速查询
- [ ] 没有定期清理机制
- [ ] 缺少备份策略
- [ ] 没有 CDN 加速
- [ ] 缺少文件使用统计

---

## 📁 文件组织结构

### 推荐的目录结构

```
public/uploads/
├── audios/                      # 音频文件
│   ├── YYYY/                    # 按年份分类
│   │   ├── MM/                  # 按月份分类
│   │   │   └── {uuid}.{ext}    # UUID + 原始扩展名
│   │   └── metadata/            # 元数据文件 (可选)
│   └── temp/                    # 临时文件 (上传中)
├── covers/                      # 封面图片
│   ├── YYYY/
│   │   └── MM/
│   │       └── {uuid}.{ext}
│   └── thumbnails/              # 缩略图
│       └── {uuid}_thumb.webp
├── documents/                   # 文档资源
│   └── slides/                  # PPT/PDF
└── trash/                       # 回收站 (待清理)
    ├── audios/
    └── covers/

data/
├── file-index.db               # 文件索引数据库
└── file-usage-stats.json       # 使用统计
```

### 文件命名规范

```typescript
// UUID 格式
{uuid}.{extension}
例: a1b2c3d4-e5f6-7890-abcd-ef1234567890.mp3

// 缩略图格式
{uuid}_thumb.{extension}
例: a1b2c3d4-e5f6-7890-abcd-ef1234567890_thumb.webp

// 时间戳格式 (仅用于临时文件)
{timestamp}_{random}.{extension}
例: 1755744213659_21secn.m4a
```

---

## 💾 存储策略

### 1. 本地存储策略

```typescript
// src/lib/storageManager.ts
interface StorageConfig {
  maxFileSize: number;        // 最大文件大小 (100MB)
  allowedFormats: string[];   // 允许的格式
  storageQuota: number;       // 总存储配额
  cleanupThreshold: number;   // 清理阈值 (80%)
}

const storageConfig: StorageConfig = {
  maxFileSize: 100 * 1024 * 1024, // 100MB
  allowedFormats: ['mp3', 'wav', 'm4a', 'aac'],
  storageQuota: 50 * 1024 * 1024 * 1024, // 50GB
  cleanupThreshold: 0.8 // 80%
};
```

### 2. 文件生命周期

```
上传 → 验证 → 转码(可选) → 存储 → 索引 → 使用 → 归档 → 删除
  ↓      ↓        ↓          ↓      ↓      ↓      ↓       ↓
  1h    即时     后台处理    即时   即时   N天   30天   永久删除
```

### 3. 存储层级

```typescript
// 热数据: 最近30天访问的文件
// 位置: local/uploads/audios/

// 温数据: 30-90天未访问
// 位置: local/uploads/archive/

// 冷数据: 90天以上未访问
// 位置: cloud-storage/archive/
```

---

## 🧹 清理与维护

### 自动清理脚本

```typescript
// scripts/cleanup-files.ts
import { promises as fs } from 'fs';
import path from 'path';
import { getDatabase } from '../src/lib/database';

interface CleanupConfig {
  dryRun: boolean;
  days: number;
  target: 'temp' | 'trash' | 'orphan';
}

async function cleanupFiles(config: CleanupConfig) {
  const db = getDatabase();
  
  switch (config.target) {
    case 'temp':
      // 清理临时文件 (24小时以上)
      await cleanupTempFiles();
      break;
      
    case 'trash':
      // 清理回收站 (30天以上)
      await cleanupTrash();
      break;
      
    case 'orphan':
      // 清理孤儿文件 (数据库中没有记录的文件)
      await cleanupOrphanFiles();
      break;
  }
}

async function cleanupOrphanFiles() {
  console.log('🔍 开始扫描孤儿文件...');
  
  // 1. 获取所有文件系统中的文件
  const fsFiles = await scanDirectory('public/uploads/audios');
  
  // 2. 获取数据库中的文件记录
  const dbFiles = await db.query('SELECT url FROM audios');
  const dbFileSet = new Set(dbFiles.rows.map(r => r.url));
  
  // 3. 找出孤儿文件
  const orphans = fsFiles.filter(file => !dbFileSet.has(file));
  
  console.log(`📊 找到 ${orphans.length} 个孤儿文件`);
  
  // 4. 移动到回收站
  for (const orphan of orphans) {
    await moveToTrash(orphan);
  }
}

async function cleanupTempFiles() {
  const tempDir = path.join(process.cwd(), 'public/uploads/temp');
  const files = await fs.readdir(tempDir);
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  let deleted = 0;
  
  for (const file of files) {
    const filePath = path.join(tempDir, file);
    const stats = await fs.stat(filePath);
    
    if (stats.mtimeMs < oneDayAgo) {
      await fs.unlink(filePath);
      deleted++;
    }
  }
  
  console.log(`🗑️  清理了 ${deleted} 个临时文件`);
}
```

### 定时任务配置

```javascript
// ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'cleanup-temp',
      script: 'node scripts/cleanup-files.js --target temp',
      cron_restart: '0 */6 * * *', // 每6小时
      autorestart: false
    },
    {
      name: 'cleanup-trash',
      script: 'node scripts/cleanup-files.js --target trash',
      cron_restart: '0 2 * * 0', // 每周日凌晨2点
      autorestart: false
    },
    {
      name: 'cleanup-orphan',
      script: 'node scripts/cleanup-files.js --target orphan',
      cron_restart: '0 3 * * 1', // 每周一凌晨3点
      autorestart: false
    }
  ]
};
```

---

## 💿 备份方案

### 1. 增量备份策略

```bash
#!/bin/bash
# scripts/backup-files.sh

BACKUP_DIR="/backup/audio-files"
SOURCE_DIR="public/uploads"
DATE=$(date +%Y%m%d_%H%M%S)

# 创建增量备份
rsync -avz --delete \
  --backup --backup-dir="$BACKUP_DIR/incremental/$DATE" \
  "$SOURCE_DIR/" "$BACKUP_DIR/latest/"

# 保留最近30天的增量备份
find "$BACKUP_DIR/incremental" -type d -mtime +30 -exec rm -rf {} \;

echo "✅ 备份完成: $DATE"
```

### 2. 云端备份

```typescript
// src/lib/cloudBackup.ts
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { createReadStream } from 'fs';

class CloudBackup {
  private s3Client: S3Client;
  
  constructor() {
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
      }
    });
  }
  
  async backupFile(localPath: string, remotePath: string) {
    const fileStream = createReadStream(localPath);
    
    await this.s3Client.send(new PutObjectCommand({
      Bucket: process.env.AWS_BACKUP_BUCKET,
      Key: remotePath,
      Body: fileStream,
      StorageClass: 'GLACIER_IR', // 低成本存储
    }));
  }
  
  async syncToCloud(dryRun = false) {
    // 同步所有文件到云端
    // 实现增量同步逻辑
  }
}
```

### 3. 备份计划

| 频率 | 类型 | 保留期 | 位置 |
|------|------|--------|------|
| 每天 | 增量 | 30天 | 本地 NAS |
| 每周 | 完整 | 90天 | 云存储 |
| 每月 | 完整 | 1年 | 云存储 (冷存储) |

---

## 🚀 CDN 集成

### 1. CDN 配置

```typescript
// src/lib/cdnManager.ts
class CDNManager {
  private cdnBaseUrl: string;
  private fallbackUrl: string;
  
  constructor() {
    this.cdnBaseUrl = process.env.CDN_BASE_URL || '';
    this.fallbackUrl = process.env.APP_BASE_URL || '';
  }
  
  getAudioUrl(audioPath: string): string {
    // 如果配置了 CDN，使用 CDN URL
    if (this.cdnBaseUrl) {
      return `${this.cdnBaseUrl}${audioPath}`;
    }
    
    // 否则使用本地 URL
    return `${this.fallbackUrl}${audioPath}`;
  }
  
  async preloadToCache(audioIds: string[]) {
    // 预加载到 CDN 缓存
    for (const id of audioIds) {
      const url = await this.getAudioUrlById(id);
      await fetch(url, { method: 'HEAD' }); // 触发 CDN 缓存
    }
  }
}
```

### 2. 推荐的 CDN 提供商

| 提供商 | 优点 | 价格 | 适用场景 |
|--------|------|------|----------|
| Cloudflare | 免费，全球节点多 | 免费/付费 | 中小型项目 |
| 阿里云 OSS | 国内速度快 | 按流量计费 | 国内用户为主 |
| 腾讯云 COS | 性价比高 | 按流量计费 | 国内项目 |
| AWS CloudFront | 稳定性高 | 按流量计费 | 国际项目 |

### 3. CDN 缓存策略

```nginx
# nginx.conf or CDN配置
location /uploads/audios/ {
  expires 30d;
  add_header Cache-Control "public, immutable";
  add_header X-Content-Type-Options "nosniff";
}

location /uploads/covers/ {
  expires 7d;
  add_header Cache-Control "public, immutable";
}
```

---

## 🎛️ 管理界面

### 资源管理页面功能

```typescript
// src/app/admin/resources/page.tsx
'use client';

export default function ResourceManagement() {
  return (
    <div>
      <h1>资源管理</h1>
      
      {/* 1. 存储概览 */}
      <StorageOverview />
      
      {/* 2. 文件列表 */}
      <FileList 
        filters={['type', 'date', 'size', 'status']}
        actions={['preview', 'download', 'delete', 'move']}
      />
      
      {/* 3. 孤儿文件检测 */}
      <OrphanFileDetector />
      
      {/* 4. 备份管理 */}
      <BackupManager />
      
      {/* 5. 使用统计 */}
      <UsageStatistics />
    </div>
  );
}
```

### 关键功能组件

#### 1. 存储概览
```typescript
interface StorageStats {
  totalSize: number;
  usedSize: number;
  fileCount: number;
  breakdown: {
    audios: number;
    covers: number;
    documents: number;
  };
}

function StorageOverview() {
  const [stats, setStats] = useState<StorageStats | null>(null);
  
  useEffect(() => {
    fetch('/api/admin/storage/stats')
      .then(r => r.json())
      .then(setStats);
  }, []);
  
  return (
    <Card>
      <Progress 
        percent={(stats.usedSize / stats.totalSize) * 100} 
        status={stats.usedSize > stats.totalSize * 0.8 ? 'exception' : 'active'}
      />
      <Statistic 
        title="已使用空间" 
        value={formatBytes(stats.usedSize)} 
        suffix={`/ ${formatBytes(stats.totalSize)}`}
      />
      <Statistic title="文件总数" value={stats.fileCount} />
    </Card>
  );
}
```

#### 2. 批量操作
```typescript
function FileList() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  
  const batchOperations = [
    { label: '批量下载', action: batchDownload },
    { label: '批量删除', action: batchDelete },
    { label: '移动到回收站', action: moveToTrash },
    { label: '导出元数据', action: exportMetadata },
  ];
  
  return (
    <Table
      rowSelection={{
        selectedRowKeys: selectedFiles,
        onChange: setSelectedFiles,
      }}
      columns={[
        { title: '文件名', dataIndex: 'name' },
        { title: '类型', dataIndex: 'type' },
        { title: '大小', dataIndex: 'size', render: formatBytes },
        { title: '上传时间', dataIndex: 'uploadDate' },
        { title: '使用次数', dataIndex: 'views' },
        { title: '状态', dataIndex: 'status' },
        { title: '操作', render: (_, record) => <Actions record={record} /> },
      ]}
    />
  );
}
```

---

## ⚡ 性能优化

### 1. 文件转码优化

```typescript
// src/lib/audioProcessor.ts
import ffmpeg from 'fluent-ffmpeg';

class AudioProcessor {
  async optimizeAudio(inputPath: string, outputPath: string) {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .audioCodec('libmp3lame')
        .audioBitrate('128k')
        .audioChannels(2)
        .audioFrequency(44100)
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });
  }
  
  async generateWaveform(audioPath: string): Promise<number[]> {
    // 生成波形数据用于可视化
    // 返回采样点数组
  }
}
```

### 2. 图片优化

```typescript
// 自动生成缩略图和 WebP 格式
import sharp from 'sharp';

async function optimizeCover(inputPath: string, outputPath: string) {
  await sharp(inputPath)
    .resize(800, 800, { fit: 'inside' })
    .webp({ quality: 85 })
    .toFile(outputPath);
  
  // 生成缩略图
  await sharp(inputPath)
    .resize(200, 200, { fit: 'cover' })
    .webp({ quality: 80 })
    .toFile(outputPath.replace('.webp', '_thumb.webp'));
}
```

### 3. 懒加载和预加载

```typescript
// 智能预加载策略
class AudioPreloader {
  async preloadNextAudio(currentIndex: number, playlist: Audio[]) {
    const nextAudio = playlist[currentIndex + 1];
    if (nextAudio) {
      const url = getAudioUrl(nextAudio.url);
      // 使用 <link rel="prefetch"> 预加载
      const link = document.createElement('link');
      link.rel = 'prefetch';
      link.href = url;
      document.head.appendChild(link);
    }
  }
}
```

---

## 📝 实施步骤

### Phase 1: 整理现有文件 (1-2天)

```bash
# 1. 创建新目录结构
mkdir -p public/uploads/{audios,covers,documents,trash}/{2024,2025}/{01..12}
mkdir -p public/uploads/temp

# 2. 运行文件整理脚本
node scripts/organize-existing-files.js

# 3. 验证整理结果
node scripts/verify-file-structure.js
```

### Phase 2: 实施新上传逻辑 (2-3天)

- [ ] 更新上传 API 使用新的目录结构
- [ ] 添加文件索引功能
- [ ] 实现自动清理临时文件
- [ ] 添加上传进度和错误处理

### Phase 3: 添加管理界面 (3-5天)

- [ ] 创建资源管理页面
- [ ] 实现文件浏览和搜索
- [ ] 添加批量操作功能
- [ ] 实现孤儿文件检测

### Phase 4: 优化和监控 (持续)

- [ ] 添加性能监控
- [ ] 实施 CDN 集成
- [ ] 设置自动备份
- [ ] 优化存储策略

---

## 🔧 配置文件

### .env 配置
```env
# 存储配置
STORAGE_MAX_SIZE=53687091200  # 50GB
STORAGE_CLEANUP_THRESHOLD=0.8

# CDN 配置
CDN_ENABLED=false
CDN_BASE_URL=https://cdn.yourdomain.com
CDN_PROVIDER=cloudflare

# 备份配置
BACKUP_ENABLED=true
BACKUP_SCHEDULE="0 2 * * *"
AWS_BACKUP_BUCKET=your-backup-bucket

# 文件处理
AUTO_TRANSCODE=true
GENERATE_THUMBNAILS=true
WAVEFORM_ENABLED=true
```

---

## 📊 监控指标

### 需要追踪的关键指标

```typescript
interface StorageMetrics {
  // 容量指标
  totalSpace: number;
  usedSpace: number;
  availableSpace: number;
  
  // 文件指标
  totalFiles: number;
  orphanFiles: number;
  tempFiles: number;
  trashedFiles: number;
  
  // 使用指标
  dailyUploads: number;
  dailyDeletes: number;
  averageFileSize: number;
  
  // 性能指标
  uploadSpeed: number;
  downloadSpeed: number;
  cdnHitRate: number;
}
```

---

## 🚨 告警规则

```typescript
const alertRules = [
  {
    metric: 'usedSpace',
    threshold: 0.85,
    action: 'notify',
    message: '存储空间使用超过85%，请及时清理'
  },
  {
    metric: 'orphanFiles',
    threshold: 100,
    action: 'notify',
    message: '孤儿文件数量过多，建议执行清理'
  },
  {
    metric: 'cdnHitRate',
    threshold: 0.6,
    action: 'notify',
    message: 'CDN命中率低于60%，请检查缓存配置'
  }
];
```

---

## 📚 相关文档

- [上传文件说明](./UPLOAD_FILES_README.md)
- [数据库结构](./DATABASE_STRUCTURE_ANALYSIS.md)
- [部署指南](./DEPLOYMENT_GUIDE_UBUNTU.md)

---

## 💡 最佳实践

1. **定期检查孤儿文件** - 每周执行一次
2. **监控存储使用** - 设置85%告警阈值
3. **自动备份** - 每天增量，每周完整
4. **CDN 优化** - 对热门文件启用 CDN
5. **文件命名** - 统一使用 UUID
6. **元数据管理** - 保持数据库和文件系统同步
7. **性能优化** - 转码为统一格式，生成缩略图
8. **访问日志** - 记录文件访问频率，优化存储策略

---

最后更新: 2025-01-04

