# Implementation Plan

- [x] 1. 创建PostgreSQL连接管理器
  - 实现统一的PostgreSQL连接池管理类
  - 配置连接参数和池设置
  - 实现连接健康检查和自动重连机制
  - _Requirements: 1.1, 1.2, 4.1, 4.2_

- [x] 2. 实现查询适配器和语法转换
  - 创建SQLite到PostgreSQL查询语法转换器
  - 实现参数占位符转换（? 到 $1, $2）
  - 处理数据类型和函数差异转换
  - _Requirements: 1.2, 3.1_

- [x] 3. 更新数据库连接层
  - 修改 src/lib/db.ts 以完全使用PostgreSQL
  - 移除SQLite相关代码和依赖
  - 实现统一的数据库操作接口
  - _Requirements: 1.1, 1.3_

- [x] 4. 修复数据库健康检查API
  - 更新 src/app/api/health/database/route.ts 使用PostgreSQL
  - 修复健康检查查询和状态判断
  - 实现PostgreSQL特定的诊断信息
  - _Requirements: 2.1, 2.2, 2.3_

- [x] 5. 修复统计API的PostgreSQL集成
  - 更新 src/app/api/admin/dashboard/stats/route.ts
  - 转换所有SQLite查询为PostgreSQL语法
  - 修复表名和列名映射问题
  - _Requirements: 3.1, 3.2_

- [x] 6. 更新其他管理员API端点
  - 修复 src/app/api/admin/dashboard/recent-activity/route.ts
  - 修复 src/app/api/admin/dashboard/popular-content/route.ts
  - 确保所有查询使用PostgreSQL语法
  - _Requirements: 3.1, 3.2_

- [x] 7. 实现统一的PostgreSQL错误处理
  - 创建PostgreSQL特定的错误处理中间件
  - 标准化数据库错误响应格式
  - 实现错误日志记录和监控
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 8. 更新连接池配置和管理
  - 优化PostgreSQL连接池参数
  - 实现连接池监控和统计
  - 添加连接池健康检查端点
  - _Requirements: 4.1, 4.2, 4.3_

- [x] 9. 创建PostgreSQL集成测试
  - 编写数据库连接和查询测试
  - 测试API端点的PostgreSQL集成
  - 验证错误处理和重连机制
  - _Requirements: 1.3, 2.3, 3.3_

- [x] 10. 验证和清理SQLite残留代码
  - 搜索并移除所有SQLite相关代码
  - 更新导入语句和依赖项
  - 确保没有SQLite连接尝试
  - _Requirements: 1.1, 1.2_