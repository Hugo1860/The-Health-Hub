import { CardTemplate } from './card-template-engine';
import { DEFAULT_LOGO_DATA_URL, DEFAULT_AUDIO_PLACEHOLDER_DATA_URL } from './placeholder-generator';

// 默认品牌资源
const DEFAULT_LOGO_URL = DEFAULT_LOGO_DATA_URL;
const DEFAULT_PLACEHOLDER_IMAGE = DEFAULT_AUDIO_PLACEHOLDER_DATA_URL;
const BRAND_NAME = '健闻局 The Health Hub';

// 经典模板 - 简洁的白色背景，左侧音频信息，右侧二维码
export const CLASSIC_TEMPLATE: CardTemplate = {
  id: 'classic',
  name: '经典模板',
  width: 1080,
  height: 1080,
  backgroundColor: '#ffffff',
  layout: {
    title: {
      x: 60,
      y: 120,
      width: 600,
      height: 120,
      fontSize: 48,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      color: '#1a1a1a',
      align: 'left',
      maxLines: 2,
      lineHeight: 60
    },
    description: {
      x: 60,
      y: 280,
      width: 600,
      height: 200,
      fontSize: 32,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      color: '#666666',
      align: 'left',
      maxLines: 4,
      lineHeight: 40
    },
    cover: {
      x: 60,
      y: 520,
      width: 300,
      height: 300,
      borderRadius: 20,
      placeholder: DEFAULT_PLACEHOLDER_IMAGE
    },
    qrCode: {
      x: 720,
      y: 200,
      size: 280,
      backgroundColor: '#ffffff',
      padding: 20,
      borderRadius: 15
    },
    branding: {
      logo: {
        x: 60,
        y: 880,
        width: 60,
        height: 60,
        url: DEFAULT_LOGO_URL
      },
      text: {
        x: 140,
        y: 920,
        fontSize: 28,
        color: '#1890ff',
        text: BRAND_NAME,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
      }
    },
    metadata: {
      duration: {
        x: 400,
        y: 580,
        width: 200,
        height: 40,
        fontSize: 24,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        color: '#999999',
        align: 'left',
        maxLines: 1
      },
      category: {
        x: 400,
        y: 620,
        width: 200,
        height: 40,
        fontSize: 24,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        color: '#1890ff',
        align: 'left',
        maxLines: 1
      }
    }
  }
};

// 现代模板 - 渐变背景，居中布局，圆形二维码
export const MODERN_TEMPLATE: CardTemplate = {
  id: 'modern',
  name: '现代模板',
  width: 1080,
  height: 1080,
  backgroundColor: '#f8fafc',
  layout: {
    title: {
      x: 90,
      y: 180,
      width: 900,
      height: 120,
      fontSize: 52,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      color: '#1e293b',
      align: 'center',
      maxLines: 2,
      lineHeight: 65
    },
    description: {
      x: 120,
      y: 340,
      width: 840,
      height: 160,
      fontSize: 28,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      color: '#64748b',
      align: 'center',
      maxLines: 3,
      lineHeight: 40
    },
    cover: {
      x: 240,
      y: 540,
      width: 280,
      height: 280,
      borderRadius: 140, // 圆形
      placeholder: DEFAULT_PLACEHOLDER_IMAGE
    },
    qrCode: {
      x: 560,
      y: 540,
      size: 280,
      backgroundColor: '#ffffff',
      padding: 25,
      borderRadius: 140 // 圆形
    },
    branding: {
      logo: {
        x: 460,
        y: 880,
        width: 60,
        height: 60,
        url: DEFAULT_LOGO_URL
      },
      text: {
        x: 540,
        y: 920,
        fontSize: 32,
        color: '#3b82f6',
        text: BRAND_NAME,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
      }
    },
    metadata: {
      duration: {
        x: 90,
        y: 880,
        width: 200,
        height: 40,
        fontSize: 24,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        color: '#94a3b8',
        align: 'left',
        maxLines: 1
      },
      category: {
        x: 790,
        y: 880,
        width: 200,
        height: 40,
        fontSize: 24,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        color: '#3b82f6',
        align: 'right',
        maxLines: 1
      }
    }
  }
};

// 医学专业模板 - 医学主题色彩，专业图标装饰
export const MEDICAL_TEMPLATE: CardTemplate = {
  id: 'medical',
  name: '医学专业模板',
  width: 1080,
  height: 1080,
  backgroundColor: '#f0f9ff',
  layout: {
    title: {
      x: 80,
      y: 140,
      width: 700,
      height: 140,
      fontSize: 46,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      color: '#0c4a6e',
      align: 'left',
      maxLines: 2,
      lineHeight: 58
    },
    description: {
      x: 80,
      y: 320,
      width: 700,
      height: 180,
      fontSize: 30,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      color: '#0369a1',
      align: 'left',
      maxLines: 4,
      lineHeight: 42
    },
    cover: {
      x: 80,
      y: 540,
      width: 320,
      height: 320,
      borderRadius: 25,
      placeholder: DEFAULT_PLACEHOLDER_IMAGE
    },
    qrCode: {
      x: 680,
      y: 180,
      size: 300,
      backgroundColor: '#ffffff',
      padding: 25,
      borderRadius: 20
    },
    branding: {
      logo: {
        x: 80,
        y: 920,
        width: 70,
        height: 70,
        url: DEFAULT_LOGO_URL
      },
      text: {
        x: 170,
        y: 965,
        fontSize: 30,
        color: '#0284c7',
        text: BRAND_NAME,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
      }
    },
    metadata: {
      duration: {
        x: 450,
        y: 600,
        width: 200,
        height: 40,
        fontSize: 26,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        color: '#0369a1',
        align: 'left',
        maxLines: 1
      },
      category: {
        x: 450,
        y: 650,
        width: 200,
        height: 40,
        fontSize: 26,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        color: '#dc2626',
        align: 'left',
        maxLines: 1
      }
    }
  }
};

// 简约模板 - 极简设计，只包含核心信息
export const MINIMAL_TEMPLATE: CardTemplate = {
  id: 'minimal',
  name: '简约模板',
  width: 1080,
  height: 1080,
  backgroundColor: '#fafafa',
  layout: {
    title: {
      x: 120,
      y: 200,
      width: 840,
      height: 160,
      fontSize: 56,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      color: '#212121',
      align: 'center',
      maxLines: 2,
      lineHeight: 70
    },
    description: {
      x: 160,
      y: 400,
      width: 760,
      height: 120,
      fontSize: 32,
      fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
      color: '#757575',
      align: 'center',
      maxLines: 2,
      lineHeight: 45
    },
    cover: {
      x: 190,
      y: 580,
      width: 260,
      height: 260,
      borderRadius: 15,
      placeholder: DEFAULT_PLACEHOLDER_IMAGE
    },
    qrCode: {
      x: 630,
      y: 580,
      size: 260,
      backgroundColor: '#ffffff',
      padding: 15,
      borderRadius: 10
    },
    branding: {
      logo: {
        x: 490,
        y: 920,
        width: 50,
        height: 50,
        url: DEFAULT_LOGO_URL
      },
      text: {
        x: 560,
        y: 955,
        fontSize: 26,
        color: '#424242',
        text: BRAND_NAME,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif'
      }
    },
    metadata: {
      duration: {
        x: 190,
        y: 880,
        width: 150,
        height: 30,
        fontSize: 22,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        color: '#9e9e9e',
        align: 'left',
        maxLines: 1
      },
      category: {
        x: 740,
        y: 880,
        width: 150,
        height: 30,
        fontSize: 22,
        fontFamily: 'PingFang SC, Microsoft YaHei, sans-serif',
        color: '#616161',
        align: 'right',
        maxLines: 1
      }
    }
  }
};

// 所有可用模板
export const AVAILABLE_TEMPLATES: CardTemplate[] = [
  CLASSIC_TEMPLATE,
  MODERN_TEMPLATE,
  MEDICAL_TEMPLATE,
  MINIMAL_TEMPLATE
];

// 模板管理类
export class CardTemplateManager {
  private static templates: Map<string, CardTemplate> = new Map();

  static {
    // 初始化模板
    AVAILABLE_TEMPLATES.forEach(template => {
      this.templates.set(template.id, template);
    });
  }

  static getTemplate(id: string): CardTemplate | undefined {
    return this.templates.get(id);
  }

  static getAllTemplates(): CardTemplate[] {
    return Array.from(this.templates.values());
  }

  static getDefaultTemplate(): CardTemplate {
    return CLASSIC_TEMPLATE;
  }

  static addTemplate(template: CardTemplate): void {
    this.templates.set(template.id, template);
  }

  static validateTemplate(template: CardTemplate): boolean {
    try {
      // 基本字段验证
      if (!template.id || !template.name || !template.width || !template.height) {
        return false;
      }

      // 布局配置验证
      const layout = template.layout;
      if (!layout.title || !layout.description || !layout.qrCode || !layout.cover || !layout.branding) {
        return false;
      }

      // 数值范围验证
      if (template.width < 100 || template.width > 2000 || 
          template.height < 100 || template.height > 2000) {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  static createCustomTemplate(
    id: string,
    name: string,
    baseTemplate: CardTemplate,
    customizations: Partial<CardTemplate>
  ): CardTemplate {
    const customTemplate: CardTemplate = {
      ...baseTemplate,
      id,
      name,
      ...customizations,
      layout: {
        ...baseTemplate.layout,
        ...customizations.layout
      }
    };

    if (this.validateTemplate(customTemplate)) {
      this.addTemplate(customTemplate);
      return customTemplate;
    } else {
      throw new Error('Invalid template configuration');
    }
  }
}