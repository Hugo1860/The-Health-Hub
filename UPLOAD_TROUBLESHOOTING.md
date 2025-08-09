# 音频上传功能故障排除指南

## 问题诊断

### 1. 检查认证状态
访问 `/debug-auth` 页面检查当前用户的认证状态：
- 确保用户已登录
- 确保用户角色为 'admin'

### 2. 检查上传功能
访问 `/test-upload` 页面进行详细的上传测试：
- 查看详细的上传日志
- 检查每个步骤的执行情况

### 3. 常见问题

#### 问题1: "No authentication found"
**原因**: 用户未登录或会话已过期
**解决方案**: 
1. 重新登录系统
2. 确保使用管理员账户登录

#### 问题2: "Admin role required"
**原因**: 当前用户不是管理员
**解决方案**: 
1. 使用管理员账户登录
2. 联系系统管理员分配管理员权限

#### 问题3: 上传成功但列表不刷新
**原因**: 前端缓存或API响应问题
**解决方案**: 
1. 手动刷新页面
2. 检查浏览器控制台的错误信息
3. 等待1-2秒后再检查列表

#### 问题4: 文件格式不支持
**支持的格式**: mp3, wav, ogg, m4a, mp4
**解决方案**: 转换文件格式或使用支持的格式

### 4. 技术细节

#### API端点
- 上传: `POST /api/admin/simple-upload`
- 获取列表: `GET /api/admin/simple-audio`

#### 数据库表
- 表名: `audios`
- 位置: `data/local.db`

#### 文件存储
- 目录: `public/uploads/`
- 命名格式: `audio_{timestamp}.{extension}`

### 5. 调试步骤

1. **检查浏览器控制台**
   - 打开开发者工具 (F12)
   - 查看 Console 标签页的错误信息

2. **检查网络请求**
   - 在开发者工具中查看 Network 标签页
   - 检查上传请求的状态码和响应

3. **检查服务器日志**
   - 查看终端中的服务器输出
   - 寻找 "Simple Admin Upload API Called" 等日志信息

4. **验证数据库**
   ```bash
   sqlite3 data/local.db "SELECT COUNT(*) FROM audios;"
   sqlite3 data/local.db "SELECT id, title, uploadDate FROM audios ORDER BY uploadDate DESC LIMIT 5;"
   ```

5. **检查文件系统**
   ```bash
   ls -la public/uploads/
   ```

### 6. 默认管理员账户

如果需要管理员权限，可以使用以下默认账户：
- 邮箱: `admin@example.com`
- 密码: `admin123`

### 7. 联系支持

如果问题仍然存在，请提供以下信息：
1. 浏览器控制台的完整错误信息
2. 网络请求的详细信息（状态码、响应内容）
3. 服务器终端的日志输出
4. 操作步骤的详细描述