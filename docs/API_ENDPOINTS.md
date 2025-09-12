# 健闻局 API 接口清单（生产版）

> 说明
- 本清单聚焦生产保留的核心接口（测试/调试端点在生产环境已被 `src/middleware.ts` 屏蔽，不在此列）。
- 统一响应结构：

```json
{
  "success": true,
  "data": {},
  "meta": {
    "requestId": "...",
    "timestamp": "2025-09-02T12:34:56.000Z",
    "version": "1.0.0",
    "environment": "production"
  }
}
```

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "...",
    "details": {}
  }
}
```

## 健康检查与系统

| 路径 | 方法 | 描述 | 入参校验 | 响应示例 |
|---|---|---|---|---|
| `/api/health` | GET | 应用综合健康检查 | 无 | `{ success, data: { status: healthy|degraded }, meta }` |
| `/api/health/database` | GET | 数据库连接/池状态 | 无 | `{ success, data: { database:{connected, poolStats...}}, meta }` |
| `/api/health/database` | POST | 强制重连数据库 | 无 | `{ success, data: { reconnection:{successful...}}, meta }` |

## 认证与会话（NextAuth）

| 路径 | 方法 | 描述 | 入参校验 | 备注 |
|---|---|---|---|---|
| `/api/auth/[...nextauth]` | ALL | NextAuth 标准端点 | 由 NextAuth 配置决定 | 需配置 `NEXTAUTH_URL/NEXTAUTH_SECRET` |
| `/api/check-session` | GET | 检查当前会话 | Cookie/Session | 返回会话状态 |

## 媒资与上传

| 路径 | 方法 | 描述 | 入参校验（zod） | 备注 |
|---|---|---|---|---|
| `/api/audio` | GET | 音频列表 | 可选分页/筛选 | 返回列表 |
| `/api/audio/[id]` | GET | 音频详情 | 路径参数 `id` 必填 | 返回音频详情 |
| `/api/audio/[id]` | PUT | 更新音频 | 路径参数 `id` + Body 校验 | 需鉴权/权限 |
| `/api/audio/[id]` | DELETE | 删除音频 | 路径参数 `id` | 需鉴权/权限 |
| `/api/audio/[id]/related` | GET | 关联资源 | `id` | 返回 related_resources |
| `/api/audio/resume/[id]` | GET/POST/PUT/DELETE | 续播状态 | `id` + Body | 用户鉴权 |
| `/api/upload` | POST | 上传音频（multipart） | 表单：`title(必)`、`description?`、`categoryId?`、`subcategoryId?`、`tags?`、`speaker?`、`recordingDate?`、`status?`、`audioFile(必)` | `withSecurity` + 类型&大小限制 + 落盘 + DB 插入（snake_case） |

请求示例（上传）

```bash
curl -X POST http://<host>/api/upload \
  -H "Cookie: <session>" \
  -F "title=测试音频" \
  -F "description=演示上传" \
  -F "categoryId=cardiology" \
  -F "status=published" \
  -F "audioFile=@/path/to/audio.mp3;type=audio/mpeg"
```

## 分类

| 路径 | 方法 | 描述 | 入参校验 | 备注 |
|---|---|---|---|---|
| `/api/categories` | GET | 分类列表 | 可选筛选 | 返回数组 |
| `/api/categories/[id]` | GET/PUT/DELETE | 分类详情/更新/删除 | `id` + Body 校验 | 管理权限 |
| `/api/categories/search` | GET | 搜索 | query 校验 | - |
| `/api/categories/tree` | GET | 分类树 | 无 | - |
| `/api/categories/reorder` | POST | 排序/层级调整 | Body 校验 | 管理权限 |
| `/api/categories/batch` | POST | 批量操作 | Body 校验 | 管理权限 |
| `/api/categories/validate` | POST | 统一校验入口 | zod：`type: 'hierarchy'|'selection'|'name'` + `data` | 返回 `{ isValid, errors? }` |

请求示例（校验 selection）

```json
{
  "type": "selection",
  "data": { "categoryId": "cardiology", "subcategoryId": "cardiology-echo" }
}
```

## 用户、收藏、评论（代表）

| 路径 | 方法 | 描述 | 入参校验 | 备注 |
|---|---|---|---|---|
| `/api/users/optimized` | GET/POST | 用户列表/创建 | Body/Query 校验 | 管理权限（创建） |
| `/api/user/profile` | GET/PUT | 我的资料 | 用户鉴权 + zod | - |
| `/api/user/favorites` | GET/POST/DELETE | 收藏 | 用户鉴权 + zod | - |
| `/api/comments` | GET/POST | 评论列表/创建 | zod | - |

## 管理与系统（保留必要）

| 路径 | 方法 | 描述 | 入参校验 | 备注 |
|---|---|---|---|---|
| `/api/admin/users` | GET/POST | 管理用户 | 管理鉴权 + zod | - |
| `/api/admin/users/[id]` | GET/PUT/DELETE | 单用户 | 管理鉴权 + zod | - |
| `/api/admin/audio` | GET/POST | 管理音频 | 管理鉴权 + zod | - |
| `/api/admin/audio/[id]` | GET/PUT/DELETE | 单音频 | 管理鉴权 + zod | - |
| `/api/admin/dashboard/*` | GET | 仪表盘数据 | 管理鉴权 | 访问数据/内容热度等 |
| `/api/database/stats` | GET | DB 统计 | 管理鉴权 | - |
| `/api/database/warmup` | POST/GET | 预热与探测 | 管理鉴权 | - |
| `/api/logging` | GET/POST/DELETE | 结构化日志管理 | 管理鉴权 + zod | - |

---

## 生产屏蔽的端点（节选）

以下前缀在生产环境由 `src/middleware.ts` 返回 404：
- `/test*`, `/debug*`, `/api/test*`, `/api/debug*`

---

## 环境与安全要点
- 鉴权：`withSecurity` / `authMiddleware.user/admin`；速率限制按用户/IP 维度（建议上传更严格）。
- 校验：所有写操作使用 zod 校验并进行 `sanitizeText/sanitizeHtml` 清洗。
- 数据库：字段统一 snake_case；`audios` 含 `category_id/subcategory_id`；导入数据前请保证目标库 schema 已迁移统一。
- 环境变量：`POSTGRES_*`、`DATABASE_URL`、`NEXTAUTH_*`、`JWT_SECRET`、`SESSION_SECRET` 必填，`BACKUP_SCHEDULE` 需加引号。

---

## 变更与生成
此文档由代码扫描与现有实现整理而成，若需要覆盖“所有端点的详细字段级入参/响应示例”，可继续按文件生成更细分清单（建议结合单元测试与注释）。


