import { ConfigProvider } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// Ant Design 现代青色主题配置
export const antdTheme = {
  token: {
    // 主色调 - 现代青色配色
    colorPrimary: '#13C2C2',
    colorSuccess: '#13C2C2',
    colorWarning: '#FAAD14',
    colorError: '#FF4D4F',
    colorInfo: '#13C2C2',
    
    // 字体
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    fontSize: 14,
    
    // 圆角
    borderRadius: 8,
    
    // 间距
    padding: 16,
    margin: 16,
    
    // 阴影
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
    
    // 布局背景色
    colorBgContainer: '#FFFFFF',
    colorBgLayout: '#F7F8FA',
    colorBgBase: '#F7F8FA',
    
    // 文本颜色
    colorText: '#333333',
    colorTextSecondary: '#999999',
    colorTextTertiary: '#CCCCCC',
    
    // 边框颜色
    colorBorder: '#E8E8E8',
    colorBorderSecondary: '#F0F0F0',
    
    // 链接颜色
    colorLink: '#13C2C2',
    colorLinkHover: '#36CFC9',
    colorLinkActive: '#08979C',
  },
  components: {
    Layout: {
      headerBg: '#FFFFFF',
      siderBg: '#13C2C2',
      bodyBg: '#F7F8FA',
      headerHeight: 64,
      headerPadding: '0 24px',
    },
    Menu: {
      darkItemBg: '#13C2C2',
      darkItemSelectedBg: '#36CFC9',
      darkItemHoverBg: '#36CFC9',
      darkItemColor: 'rgba(255, 255, 255, 0.85)',
      darkItemSelectedColor: '#FFFFFF',
    },
    Card: {
      borderRadius: 12,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      headerBg: '#FFFFFF',
      colorBgContainer: '#FFFFFF',
    },
    Button: {
      borderRadius: 8,
      primaryShadow: '0 2px 4px rgba(19, 194, 194, 0.2)',
    },
    Input: {
      borderRadius: 8,
      colorBgContainer: '#FFFFFF',
    },
    Select: {
      borderRadius: 8,
      colorBgContainer: '#FFFFFF',
    },
    Tag: {
      colorWarning: '#FAAD14',
      colorWarningBg: '#FFF7E6',
      colorWarningBorder: '#FFD591',
    },
  },
};

// Ant Design 全局配置
export const antdConfig = {
  locale: zhCN,
  theme: antdTheme,
  componentSize: 'middle' as const,
};

export default antdConfig;