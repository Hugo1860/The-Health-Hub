/**
 * 主题管理器
 * 提供主题切换功能
 */

export type ThemeType = 'wechat' | 'elegant' | 'dark';

export interface ThemeConfig {
  name: string;
  displayName: string;
  description: string;
  cssFile: string;
}

export const themes: Record<ThemeType, ThemeConfig> = {
  wechat: {
    name: 'wechat',
    displayName: '微信简约',
    description: '微信风格简约大气的配色方案',
    cssFile: '/styles/wechat-theme.css'
  },
  elegant: {
    name: 'elegant',
    displayName: '优雅深色',
    description: '专业的深色主题配色',
    cssFile: '/styles/elegant-theme.css'
  },
  dark: {
    name: 'dark',
    displayName: '经典深色',
    description: '传统的深色主题',
    cssFile: '/styles/dark-theme.css'
  }
};

/**
 * 主题管理器类
 */
export class ThemeManager {
  private static instance: ThemeManager;
  private currentTheme: ThemeType = 'wechat';
  private listeners: Set<(theme: ThemeType) => void> = new Set();

  /**
   * 获取主题管理器单例
   */
  public static getInstance(): ThemeManager {
    if (!ThemeManager.instance) {
      ThemeManager.instance = new ThemeManager();
    }
    return ThemeManager.instance;
  }

  /**
   * 获取当前主题
   */
  public getCurrentTheme(): ThemeType {
    return this.currentTheme;
  }

  /**
   * 设置主题
   */
  public setTheme(theme: ThemeType): void {
    if (this.currentTheme === theme) return;

    this.currentTheme = theme;
    this.applyTheme(theme);
    this.saveTheme(theme);
    this.notifyListeners(theme);
  }

  /**
   * 应用主题
   */
  private applyTheme(theme: ThemeType): void {
    const themeConfig = themes[theme];
    
    // 移除所有主题类
    document.documentElement.classList.remove('theme-wechat', 'theme-elegant', 'theme-dark');
    
    // 添加新的主题类
    document.documentElement.classList.add(`theme-${theme}`);
    
    // 更新body类
    document.body.className = document.body.className
      .replace(/theme-\w+/g, '')
      .replace(/\s+/g, ' ')
      .trim();
    document.body.classList.add(`theme-${theme}`);
  }

  /**
   * 保存主题到本地存储
   */
  private saveTheme(theme: ThemeType): void {
    if (typeof window !== 'undefined') {
      localStorage.setItem('preferred-theme', theme);
    }
  }

  /**
   * 从本地存储加载主题
   */
  public loadSavedTheme(): ThemeType {
    if (typeof window === 'undefined') return 'wechat';
    
    const savedTheme = localStorage.getItem('preferred-theme') as ThemeType;
    return themes[savedTheme] ? savedTheme : 'wechat';
  }

  /**
   * 初始化主题
   */
  public initializeTheme(): void {
    const savedTheme = this.loadSavedTheme();
    this.setTheme(savedTheme);
  }

  /**
   * 添加主题变更监听器
   */
  public addThemeListener(listener: (theme: ThemeType) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * 通知监听器主题变更
   */
  private notifyListeners(theme: ThemeType): void {
    this.listeners.forEach(listener => listener(theme));
  }

  /**
   * 获取所有可用主题
   */
  public getAvailableThemes(): ThemeConfig[] {
    return Object.values(themes);
  }
}

/**
 * React Hook: 使用主题
 */
import { useState, useEffect } from 'react';

export function useTheme() {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('wechat');
  const themeManager = ThemeManager.getInstance();

  useEffect(() => {
    // 初始化主题
    const savedTheme = themeManager.loadSavedTheme();
    setCurrentTheme(savedTheme);
    themeManager.setTheme(savedTheme);

    // 添加主题变更监听器
    const unsubscribe = themeManager.addThemeListener((theme) => {
      setCurrentTheme(theme);
    });

    return unsubscribe;
  }, []);

  const setTheme = (theme: ThemeType) => {
    themeManager.setTheme(theme);
  };

  return {
    currentTheme,
    setTheme,
    availableThemes: themeManager.getAvailableThemes()
  };
}

/**
 * 主题切换组件使用示例
 * 
 * 在React组件中使用：
 * ```tsx
 * import { useTheme } from '@/lib/themeManager';
 * 
 * function ThemeSelector() {
 *   const { currentTheme, setTheme, availableThemes } = useTheme();
 *   
 *   return (
 *     <div className="theme-switcher">
 *       <label className="block text-sm font-medium text-gray-700 mb-2">
 *         主题选择
 *       </label>
 *       <select
 *         value={currentTheme}
 *         onChange={(e) => setTheme(e.target.value as ThemeType)}
 *         className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
 *       >
 *         {availableThemes.map((theme) => (
 *           <option key={theme.name} value={theme.name}>
 *             {theme.displayName} - {theme.description}
 *           </option>
 *         ))}
 *       </select>
 *     </div>
 *   );
 * }
 * ```
 */

// 导出主题管理器实例
export const themeManager = ThemeManager.getInstance();