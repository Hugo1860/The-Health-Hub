# 🎯 Health Hub 部署检查清单

## 📋 使用说明

按照以下清单逐项检查，确保部署成功且安全。

---

## 阶段一：部署前准备

### 服务器环境检查

- [ ] **操作系统**: Ubuntu 22.04 LTS x86_64
- [ ] **CPU**: 至少2核
- [ ] **内存**: 至少2GB（推荐4GB）
- [ ] **硬盘**: 至少20GB可用空间
- [ ] **SSH访问**: 已配置密钥或密码登录

### 网络配置

- [ ] **服务器IP**: 已获取并可访问
- [ ] **域名**: 已解析到服务器IP（如使用域名）
- [ ] **防火墙**: SSH端口(22)可访问
- [ ] **网络速度**: 上传下载速度正常

### 本地准备

- [ ] **项目代码**: 已更新到最新版本
- [ ] **依赖安装**: 本地npm依赖已安装
- [ ] **Git仓库**: 代码已提交（如使用Git）
- [ ] **部署脚本**: 已下载并赋予执行权限

---

## 阶段二：部署执行

### Docker部署方式

- [ ] **上传代码**: 代码已成功上传到服务器
  ```bash
  ./upload-and-deploy.sh user@server-ip
  ```

- [ ] **Docker安装**: Docker和Docker Compose已安装
  ```bash
  docker --version
  docker compose version
  ```

- [ ] **环境变量配置**: .env.production已创建并配置
  - [ ] NEXTAUTH_URL已修改
  - [ ] NEXTAUTH_SECRET已生成（32位）
  - [ ] SESSION_SECRET已生成（32位）
  - [ ] JWT_SECRET已生成（32位）
  - [ ] CSRF_SECRET已生成（32位）
  - [ ] 数据库密码已修改

- [ ] **构建镜像**: Docker镜像构建成功
  ```bash
  docker compose build
  ```

- [ ] **启动服务**: 容器启动成功
  ```bash
  docker compose up -d
  docker compose ps  # 确认都是Up状态
  ```

- [ ] **数据库初始化**: 数据库迁移已执行
  ```bash
  docker compose exec -T db mysql -u health_app -p health_hub < database/migrations/002_create_user_action_logs.sql
  ```

### PM2部署方式（如不使用Docker）

- [ ] **Node.js安装**: Node.js 20+已安装
- [ ] **MySQL安装**: MySQL 8.0已安装
- [ ] **数据库创建**: health_hub数据库已创建
- [ ] **用户权限**: 数据库用户已创建并授权
- [ ] **依赖安装**: npm install完成
- [ ] **项目构建**: npm run build成功
- [ ] **PM2安装**: PM2已全局安装
- [ ] **应用启动**: PM2启动应用成功
- [ ] **开机启动**: PM2 startup已配置

---

## 阶段三：功能验证

### 基础功能测试

- [ ] **首页访问**: http://server-ip:3000 可正常打开
  ```bash
  curl http://localhost:3000
  ```

- [ ] **健康检查**: API健康检查通过
  ```bash
  curl http://localhost:3000/api/health
  ```

- [ ] **数据库连接**: 数据库连接正常
  ```bash
  docker compose exec db mysql -u health_app -p -e "SHOW DATABASES;"
  ```

- [ ] **静态资源**: 图片、CSS、JS加载正常

### 核心功能测试

- [ ] **用户注册**: 可以注册新用户
- [ ] **用户登录**: 可以正常登录
- [ ] **音频播放**: 可以播放音频文件
- [ ] **音频上传**: 可以上传新音频（管理员）
- [ ] **分类浏览**: 分类和标签显示正常
- [ ] **搜索功能**: 搜索功能工作正常
- [ ] **后台管理**: 可以访问管理后台

### 日志和监控

- [ ] **应用日志**: 日志正常输出，无严重错误
  ```bash
  docker compose logs app --tail=50
  ```

- [ ] **数据库日志**: 数据库日志正常
  ```bash
  docker compose logs db --tail=20
  ```

- [ ] **错误日志**: 无重复错误或警告
- [ ] **资源使用**: CPU和内存使用在正常范围
  ```bash
  docker stats
  ```

---

## 阶段四：安全配置

### 密钥和密码

- [ ] **修改默认密码**: 所有默认密码已修改
  - [ ] MYSQL_ROOT_PASSWORD
  - [ ] MYSQL_PASSWORD
  - [ ] 管理员账号密码

- [ ] **生成新密钥**: 所有密钥已重新生成
  - [ ] NEXTAUTH_SECRET
  - [ ] SESSION_SECRET
  - [ ] JWT_SECRET
  - [ ] CSRF_SECRET

- [ ] **密钥长度**: 所有密钥至少32位

### 防火墙配置

- [ ] **SSH端口**: 22端口已允许
  ```bash
  sudo ufw allow 22/tcp
  ```

- [ ] **HTTP端口**: 80端口已允许（如使用Nginx）
  ```bash
  sudo ufw allow 80/tcp
  ```

- [ ] **HTTPS端口**: 443端口已允许（如使用SSL）
  ```bash
  sudo ufw allow 443/tcp
  ```

- [ ] **应用端口**: 3000端口配置正确
  ```bash
  sudo ufw allow 3000/tcp  # 如需直接访问
  ```

- [ ] **防火墙启用**: UFW防火墙已启用
  ```bash
  sudo ufw enable
  sudo ufw status
  ```

### SSH安全

- [ ] **禁用root登录**: 已禁用root直接SSH登录
- [ ] **密钥认证**: 已配置SSH密钥认证
- [ ] **修改SSH端口**: 已修改默认22端口（可选）
- [ ] **失败登录限制**: 已配置fail2ban（可选）

---

## 阶段五：性能优化

### 应用优化

- [ ] **Next.js配置**: output: 'standalone'已配置
- [ ] **图片优化**: 图片已压缩和优化
- [ ] **缓存配置**: Redis或内存缓存已配置（可选）
- [ ] **CDN配置**: 静态资源CDN已配置（可选）

### 数据库优化

- [ ] **索引检查**: 重要表已创建索引
- [ ] **连接池配置**: 连接池参数已优化
- [ ] **慢查询日志**: 已启用慢查询日志
- [ ] **备份策略**: 数据库自动备份已配置

### Nginx优化（如使用）

- [ ] **反向代理**: Nginx反向代理已配置
- [ ] **Gzip压缩**: Gzip压缩已启用
- [ ] **缓存配置**: 静态资源缓存已配置
- [ ] **限流配置**: 请求限流已配置

---

## 阶段六：监控和备份

### 监控配置

- [ ] **健康检查**: 定期健康检查已设置
  ```bash
  */5 * * * * /path/to/server-health-check.sh >> /var/log/health-check.log 2>&1
  ```

- [ ] **日志监控**: 日志收集和监控已配置
- [ ] **资源监控**: CPU、内存、磁盘监控已设置
- [ ] **告警配置**: 异常告警通知已配置

### 备份配置

- [ ] **数据库备份**: 自动备份脚本已配置
  ```bash
  0 2 * * * docker compose exec db mysqldump -u root -p health_hub > /backups/db_$(date +\%Y\%m\%d).sql
  ```

- [ ] **文件备份**: 上传文件自动备份已配置
  ```bash
  0 3 * * * tar -czf /backups/uploads_$(date +\%Y\%m\%d).tar.gz /path/to/public/uploads/
  ```

- [ ] **配置备份**: 配置文件已备份
- [ ] **备份测试**: 备份恢复流程已测试
- [ ] **异地备份**: 备份文件已同步到其他位置

---

## 阶段七：域名和SSL

### 域名配置（可选）

- [ ] **DNS解析**: 域名A记录已指向服务器IP
- [ ] **DNS生效**: DNS解析已生效（可访问）
  ```bash
  nslookup your-domain.com
  ```

- [ ] **Nginx配置**: 域名虚拟主机已配置
- [ ] **环境变量更新**: NEXTAUTH_URL已更新为域名

### SSL证书配置（推荐）

- [ ] **Certbot安装**: Certbot已安装
  ```bash
  sudo apt install certbot python3-certbot-nginx -y
  ```

- [ ] **证书申请**: SSL证书已申请并安装
  ```bash
  sudo certbot --nginx -d your-domain.com
  ```

- [ ] **HTTPS访问**: https://your-domain.com可正常访问
- [ ] **HTTP重定向**: HTTP自动重定向到HTTPS
- [ ] **证书续期**: 自动续期已配置
  ```bash
  sudo certbot renew --dry-run
  ```

---

## 阶段八：文档和移交

### 文档整理

- [ ] **部署文档**: 部署过程已记录
- [ ] **配置说明**: 重要配置已说明
- [ ] **账号密码**: 账号密码已安全保存
- [ ] **故障排查**: 常见问题解决方案已记录

### 团队培训

- [ ] **管理培训**: 团队成员已了解如何管理
- [ ] **常用命令**: 常用命令已整理和分享
- [ ] **应急预案**: 应急处理流程已制定
- [ ] **联系方式**: 技术支持联系方式已提供

---

## 🎯 最终检查

### 全面测试

- [ ] **浏览器测试**: 在不同浏览器中测试
- [ ] **移动端测试**: 在手机上测试访问
- [ ] **性能测试**: 页面加载速度正常
- [ ] **压力测试**: 并发访问测试通过

### 运行健康检查

```bash
./server-health-check.sh
```

- [ ] **Docker状态**: ✅ 所有容器运行正常
- [ ] **网络连接**: ✅ 容器间网络正常
- [ ] **端口监听**: ✅ 端口正常监听
- [ ] **数据库连接**: ✅ 数据库连接正常
- [ ] **应用健康**: ✅ 健康检查通过
- [ ] **系统资源**: ✅ 资源使用正常

---

## ✅ 部署完成确认

所有上述项目都已完成并测试通过后，可以认为部署成功！

### 最终确认清单

- [ ] 应用可正常访问
- [ ] 所有核心功能正常
- [ ] 安全配置已完成
- [ ] 监控和备份已设置
- [ ] SSL证书已配置（如需要）
- [ ] 文档已整理完成

---

## 📞 获取帮助

如遇到问题，请参考：

1. **QUICK_START_UBUNTU.md** - 快速开始指南
2. **DEPLOYMENT_GUIDE_UBUNTU.md** - 详细部署文档
3. **DEPLOY_README.md** - 部署方案总结
4. **运行健康检查**: `./server-health-check.sh`
5. **查看日志**: `docker compose logs -f`

---

**部署日期**: _____________

**部署人员**: _____________

**服务器IP**: _____________

**域名**: _____________

**备注**: _____________

---

🎉 祝部署成功！

