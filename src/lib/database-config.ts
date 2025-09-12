// import { DatabaseConfig, DatabaseType } from './database-adapter'; // Deprecated

// 简化的类型定义
export type DatabaseType = 'postgresql';

export interface DatabaseConfig {
  type: DatabaseType;
  connection: {
    host: string;
    port: number;
    database: string;
    username: string;
    password?: string;
    ssl?: boolean;
  };
  pool?: {
    min: number;
    max: number;
    acquireTimeoutMillis: number;
    idleTimeoutMillis: number;
  };
  performance?: {
    statementTimeout: number;
    queryTimeout: number;
    maxConnections: number;
  };
}

// 数据库配置模板
export interface DatabaseConfigTemplate {
  name: string;
  type: DatabaseType;
  description: string;
  defaultConfig: Partial<DatabaseConfig>;
  requiredFields: string[];
  optionalFields: string[];
}

// 预定义的数据库配置模板 - 只支持PostgreSQL
export const DATABASE_CONFIG_TEMPLATES: Record<string, DatabaseConfigTemplate> = {
  postgresql_local: {
    name: 'PostgreSQL Local',
    type: 'postgresql',
    description: 'Local PostgreSQL database',
    defaultConfig: {
      type: 'postgresql',
      connection: {
        host: 'localhost',
        port: 5432,
        database: 'health_hub',
        username: 'postgres',
        ssl: false
      },
      pool: {
        min: 2,
        max: 10,
        acquireTimeoutMillis: 30000,
        idleTimeoutMillis: 300000
      },
      performance: {
        statementTimeout: 30000,
        queryTimeout: 15000,
        maxConnections: 10
      }
    },
    requiredFields: ['connection.host', 'connection.port', 'connection.database', 'connection.username'],
    optionalFields: ['connection.password', 'connection.ssl', 'pool.min', 'pool.max']
  },

  postgresql_cloud: {
    name: 'PostgreSQL Cloud',
    type: 'postgresql',
    description: 'Cloud PostgreSQL database (e.g., AWS RDS, Google Cloud SQL)',
    defaultConfig: {
      type: 'postgresql',
      connection: {
        host: 'your-cloud-host.com',
        port: 5432,
        database: 'health_hub',
        username: 'postgres',
        ssl: true
      },
      pool: {
        min: 5,
        max: 20,
        acquireTimeoutMillis: 60000,
        idleTimeoutMillis: 300000
      },
      performance: {
        statementTimeout: 30000,
        queryTimeout: 15000,
        maxConnections: 100
      }
    },
    requiredFields: ['connection.host', 'connection.port', 'connection.database', 'connection.username', 'connection.password'],
    optionalFields: ['connection.ssl', 'pool.min', 'pool.max']
  }
};

// 数据库配置工具类
export class DatabaseConfigUtils {
  static validateConfig(config: Partial<DatabaseConfig>, template: DatabaseConfigTemplate): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    // 检查必需字段
    for (const field of template.requiredFields) {
      const value = this.getNestedValue(config, field);
      if (value === undefined || value === null || value === '') {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }
  
  static mergeWithTemplate(config: Partial<DatabaseConfig>, template: DatabaseConfigTemplate): DatabaseConfig {
    return {
      ...template.defaultConfig,
      ...config
    } as DatabaseConfig;
  }
  
  private static getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }
}

// 数据库配置构建器
export class DatabaseConfigBuilder {
  private config: Partial<DatabaseConfig> = {};
  
  setType(type: DatabaseType): this {
    this.config.type = type;
    return this;
  }
  
  setConnection(connection: Partial<DatabaseConfig['connection']>): this {
    this.config.connection = { ...this.config.connection, ...connection };
    return this;
  }
  
  setPool(pool: Partial<DatabaseConfig['pool']>): this {
    this.config.pool = { ...this.config.pool, ...pool };
    return this;
  }
  
  setPerformance(performance: Partial<DatabaseConfig['performance']>): this {
    this.config.performance = { ...this.config.performance, ...performance };
    return this;
  }
  
  build(): DatabaseConfig {
    if (!this.config.type) {
      throw new Error('Database type is required');
    }
    
    return this.config as DatabaseConfig;
  }
  
  buildFromTemplate(templateName: string): DatabaseConfig {
    const template = DATABASE_CONFIG_TEMPLATES[templateName];
    if (!template) {
      throw new Error(`Template '${templateName}' not found`);
    }
    
    return DatabaseConfigUtils.mergeWithTemplate(this.config, template);
  }
}