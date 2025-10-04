module.exports = {
  apps: [{
    name: 'health-hub',
    script: 'npm start',
    instances: 'max', // 使用所有CPU核心
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000,
      // 生产环境特定配置
      LOG_LEVEL: 'info',
      ENABLE_COMPRESSION: true,
      ENABLE_MONITORING: true
    },
    // 日志配置
    log_file: './logs/app.log',
    out_file: './logs/out.log',
    error_file: './logs/error.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',

    // 重启策略
    autorestart: true,
    restart_delay: 4000,
    max_restarts: 10,
    min_uptime: '10s',

    // 内存限制
    max_memory_restart: '1G',

    // 健康检查
    health_check: {
      enabled: true,
      url: 'http://localhost:3000/api/health',
      timeout: 5000,
      interval: 30000
    },

    // 环境变量
    env: {
      NODE_ENV: 'development'
    },

    // 开发环境配置
    env_development: {
      NODE_ENV: 'development',
      LOG_LEVEL: 'debug',
      DEBUG: true
    },

    // 生产环境配置
    env_production: {
      NODE_ENV: 'production',
      LOG_LEVEL: 'info',
      COMPRESSION_LEVEL: 6,
      ENABLE_CORS: false
    }
  }],

  // 部署配置
  deploy: {
    production: {
      user: 'deploy',
      host: ['your-production-server'],
      ref: 'origin/main',
      repo: 'https://github.com/your-repo/health-hub.git',
      path: '/var/www/health-hub',
      'pre-deploy-local': '',
      'post-deploy': 'npm install && npm run build && pm2 reload ecosystem.config.js --env production',
      'pre-setup': ''
    }
  }
};
