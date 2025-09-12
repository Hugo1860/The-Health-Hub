// Jest环境变量配置

// 设置测试环境变量
process.env.NODE_ENV = 'test';
process.env.DB_TYPE = 'postgresql';

// PostgreSQL测试数据库配置
process.env.DB_HOST = process.env.TEST_DB_HOST || 'localhost';
process.env.DB_PORT = process.env.TEST_DB_PORT || '5432';
process.env.DB_DATABASE = process.env.TEST_DB_DATABASE || 'health_hub_test';
process.env.DB_USERNAME = process.env.TEST_DB_USERNAME || 'postgres';
process.env.DB_PASSWORD = process.env.TEST_DB_PASSWORD || '';
process.env.DB_SSL = process.env.TEST_DB_SSL || 'false';

// 其他测试配置
process.env.NEXTAUTH_SECRET = 'test-secret';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

console.log('PostgreSQL test environment configured:', {
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_DATABASE,
  user: process.env.DB_USERNAME
});