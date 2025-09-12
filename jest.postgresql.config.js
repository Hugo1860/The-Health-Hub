// Jest配置文件 - PostgreSQL集成测试

const nextJest = require('next/jest');

const createJestConfig = nextJest({
  // 提供Next.js应用的路径以加载next.config.js和.env文件
  dir: './',
});

// 添加任何自定义配置到Jest
const customJestConfig = {
  // 添加更多设置选项在每次测试运行之前
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // 如果使用TypeScript与基础路径，你需要下面的moduleNameMapping
  moduleNameMapping: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
  
  testEnvironment: 'node',
  
  // 测试文件匹配模式
  testMatch: [
    '**/__tests__/**/*postgresql*.test.ts',
    '**/*postgresql*.test.ts'
  ],
  
  // 覆盖率配置
  collectCoverageFrom: [
    'src/lib/postgresql-*.ts',
    'src/lib/database.ts',
    'src/lib/query-adapter.ts',
    'src/app/api/health/**/*.ts',
    'src/app/api/admin/dashboard/**/*.ts',
    '!**/*.d.ts',
    '!**/node_modules/**',
  ],
  
  // 测试超时时间（PostgreSQL测试可能需要更长时间）
  testTimeout: 30000,
  
  // 环境变量
  setupFiles: ['<rootDir>/jest.env.js'],
  
  // 忽略的文件
  testPathIgnorePatterns: [
    '<rootDir>/.next/',
    '<rootDir>/node_modules/',
  ],
  
  // 转换配置
  transform: {
    '^.+\\.(js|jsx|ts|tsx)$': ['babel-jest', { presets: ['next/babel'] }],
  },
  
  // 模块文件扩展名
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
  
  // 全局设置
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json',
    },
  },
};

// createJestConfig是异步的，所以你需要导出一个函数
module.exports = createJestConfig(customJestConfig);