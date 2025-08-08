import type { ThemeConfig } from 'antd';

const theme: ThemeConfig = {
  token: {
    // 深色主题配色方案
    colorPrimary: '#E9ECEF',
    colorSuccess: '#10b981',
    colorWarning: '#FFC107',
    colorError: '#ef4444',
    colorInfo: '#6F42C1',
    
    // 边框圆角
    borderRadius: 8,
    
    // 字体
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif',
  },
  components: {
    Button: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Input: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Select: {
      borderRadius: 8,
      controlHeight: 40,
    },
    Table: {
      borderRadius: 12,
      headerBg: '#f8f9fa',
    },
    Card: {
      borderRadius: 12,
    },
    Modal: {
      borderRadius: 12,
    },
  },
};

export default theme;