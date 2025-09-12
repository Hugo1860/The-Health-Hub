/**
 * Environment Configuration Management System
 * Handles loading, validation, and management of environment-specific configurations
 */

export interface DatabaseConfig {
  type: 'postgresql';
  connectionString: string;
  poolSize: number;
  timeout: number;
  retryAttempts: number;
  healthCheckInterval: number;
}

export interface ServerConfig {
  port: number;
  host: string;
  ssl: boolean;
  cors: {
    origin: string[];
    credentials: boolean;
  };
  maxRequestSize: string;
  timeout: number;
}

export interface LoggingConfig {
  level: 'debug' | 'info' | 'warn' | 'error';
  destination: 'console' | 'file' | 'both';
  rotation: boolean;
  maxFileSize: string;
  maxFiles: number;
}

export interface SecurityConfig {
  jwtSecret: string;
  sessionSecret: string;
  bcryptRounds: number;
  rateLimitWindow: number;
  rateLimitMax: number;
  csrfProtection: boolean;
}

export interface AppConfig {
  nodeVersion: string;
  environment: 'development' | 'staging' | 'production';
  database: DatabaseConfig;
  server: ServerConfig;
  logging: LoggingConfig;
  security: SecurityConfig;
  features: {
    enableAnalytics: boolean;
    enableCaching: boolean;
    enableCompression: boolean;
    enableHealthChecks: boolean;
  };
}

/**
 * Configuration validation schema
 */
const configSchema = {
  required: [
    'NODE_ENV',
    'DATABASE_URL',
    'JWT_SECRET',
    'SESSION_SECRET'
  ],
  optional: [
    'PORT',
    'HOST',
    'SSL_ENABLED',
    'CORS_ORIGIN',
    'LOG_LEVEL',
    'LOG_DESTINATION',
    'DB_POOL_SIZE',
    'DB_TIMEOUT',
    'BCRYPT_ROUNDS',
    'RATE_LIMIT_WINDOW',
    'RATE_LIMIT_MAX',
    'ENABLE_ANALYTICS',
    'ENABLE_CACHING',
    'ENABLE_COMPRESSION',
    'ENABLE_HEALTH_CHECKS'
  ]
};

/**
 * Default configuration values
 */
const defaultConfig: Partial<AppConfig> = {
  server: {
    port: 3000,
    host: '0.0.0.0',
    ssl: false,
    cors: {
      origin: ['http://localhost:3000'],
      credentials: true
    },
    maxRequestSize: '10mb',
    timeout: 30000
  },
  database: {
    type: 'postgresql',
    poolSize: 10,
    timeout: 5000,
    retryAttempts: 3,
    healthCheckInterval: 30000
  },
  logging: {
    level: 'info',
    destination: 'console',
    rotation: false,
    maxFileSize: '10mb',
    maxFiles: 5
  },
  security: {
    bcryptRounds: 12,
    rateLimitWindow: 15 * 60 * 1000, // 15 minutes
    rateLimitMax: 100,
    csrfProtection: true
  },
  features: {
    enableAnalytics: false,
    enableCaching: true,
    enableCompression: true,
    enableHealthChecks: true
  }
};

/**
 * Configuration validation errors
 */
export class ConfigValidationError extends Error {
  constructor(
    public field: string,
    public reason: string,
    public value?: any
  ) {
    super(`Configuration validation failed for ${field}: ${reason}`);
    this.name = 'ConfigValidationError';
  }
}

/**
 * Environment configuration loader and validator
 */
export class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig | null = null;
  private validationErrors: ConfigValidationError[] = [];

  private constructor() {}

  static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  /**
   * Load and validate configuration from environment variables
   */
  async loadConfig(): Promise<AppConfig> {
    if (this.config) {
      return this.config;
    }

    try {
      // Validate required environment variables
      this.validateRequiredVariables();

      // Load configuration with fallbacks
      this.config = this.buildConfiguration();

      // Validate configuration values
      this.validateConfiguration(this.config);

      // Log configuration summary (without secrets)
      this.logConfigurationSummary(this.config);

      return this.config;
    } catch (error) {
      console.error('Failed to load configuration:', error);
      throw error;
    }
  }

  /**
   * Get current configuration (throws if not loaded)
   */
  getConfig(): AppConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadConfig() first.');
    }
    return this.config;
  }

  /**
   * Validate that all required environment variables are present
   */
  private validateRequiredVariables(): void {
    const missing: string[] = [];

    for (const variable of configSchema.required) {
      if (!process.env[variable]) {
        missing.push(variable);
      }
    }

    if (missing.length > 0) {
      throw new ConfigValidationError(
        'required_variables',
        `Missing required environment variables: ${missing.join(', ')}`
      );
    }
  }  /**
   
* Build configuration object from environment variables with fallbacks
   */
  private buildConfiguration(): AppConfig {
    const env = process.env.NODE_ENV || 'development';
    
    return {
      nodeVersion: process.version,
      environment: env as 'development' | 'staging' | 'production',
      
      database: {
        type: this.getDatabaseType(process.env.DATABASE_URL!),
        connectionString: process.env.DATABASE_URL!,
        poolSize: parseInt(process.env.DB_POOL_SIZE || '10'),
        timeout: parseInt(process.env.DB_TIMEOUT || '5000'),
        retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
        healthCheckInterval: parseInt(process.env.DB_HEALTH_CHECK_INTERVAL || '30000')
      },
      
      server: {
        port: parseInt(process.env.PORT || '3000'),
        host: process.env.HOST || defaultConfig.server!.host,
        ssl: process.env.SSL_ENABLED === 'true',
        cors: {
          origin: process.env.CORS_ORIGIN 
            ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
            : defaultConfig.server!.cors.origin,
          credentials: process.env.CORS_CREDENTIALS !== 'false'
        },
        maxRequestSize: process.env.MAX_REQUEST_SIZE || defaultConfig.server!.maxRequestSize,
        timeout: parseInt(process.env.SERVER_TIMEOUT || '30000')
      },
      
      logging: {
        level: (process.env.LOG_LEVEL || defaultConfig.logging!.level) as LoggingConfig['level'],
        destination: (process.env.LOG_DESTINATION || defaultConfig.logging!.destination) as LoggingConfig['destination'],
        rotation: process.env.LOG_ROTATION === 'true',
        maxFileSize: process.env.LOG_MAX_FILE_SIZE || defaultConfig.logging!.maxFileSize,
        maxFiles: parseInt(process.env.LOG_MAX_FILES || '5')
      },
      
      security: {
        jwtSecret: process.env.JWT_SECRET!,
        sessionSecret: process.env.SESSION_SECRET!,
        bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || '12'),
        rateLimitWindow: parseInt(process.env.RATE_LIMIT_WINDOW || '900000'), // 15 minutes
        rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || '100'),
        csrfProtection: process.env.CSRF_PROTECTION !== 'false'
      },
      
      features: {
        enableAnalytics: process.env.ENABLE_ANALYTICS === 'true',
        enableCaching: process.env.ENABLE_CACHING !== 'false',
        enableCompression: process.env.ENABLE_COMPRESSION !== 'false',
        enableHealthChecks: process.env.ENABLE_HEALTH_CHECKS !== 'false'
      }
    };
  }

  /**
   * Determine database type from connection string
   */
  private getDatabaseType(connectionString: string): DatabaseConfig['type'] {
    if (connectionString.startsWith('postgresql://') || connectionString.startsWith('postgres://')) {
      return 'postgresql';
    }
    // 只支持PostgreSQL
    return 'postgresql';
  }

  /**
   * Validate configuration values
   */
  private validateConfiguration(config: AppConfig): void {
    this.validationErrors = [];

    // Validate environment
    if (!['development', 'staging', 'production'].includes(config.environment)) {
      this.validationErrors.push(new ConfigValidationError(
        'NODE_ENV',
        'Must be one of: development, staging, production',
        config.environment
      ));
    }

    // Validate server configuration
    if (config.server.port < 1 || config.server.port > 65535) {
      this.validationErrors.push(new ConfigValidationError(
        'PORT',
        'Must be between 1 and 65535',
        config.server.port
      ));
    }

    // Validate database configuration
    if (config.database.poolSize < 1 || config.database.poolSize > 100) {
      this.validationErrors.push(new ConfigValidationError(
        'DB_POOL_SIZE',
        'Must be between 1 and 100',
        config.database.poolSize
      ));
    }

    if (config.database.timeout < 1000) {
      this.validationErrors.push(new ConfigValidationError(
        'DB_TIMEOUT',
        'Must be at least 1000ms',
        config.database.timeout
      ));
    }

    // Validate logging configuration
    if (!['debug', 'info', 'warn', 'error'].includes(config.logging.level)) {
      this.validationErrors.push(new ConfigValidationError(
        'LOG_LEVEL',
        'Must be one of: debug, info, warn, error',
        config.logging.level
      ));
    }

    // Validate security configuration
    if (config.security.jwtSecret.length < 32) {
      this.validationErrors.push(new ConfigValidationError(
        'JWT_SECRET',
        'Must be at least 32 characters long',
        '***'
      ));
    }

    if (config.security.sessionSecret.length < 32) {
      this.validationErrors.push(new ConfigValidationError(
        'SESSION_SECRET',
        'Must be at least 32 characters long',
        '***'
      ));
    }

    if (config.security.bcryptRounds < 10 || config.security.bcryptRounds > 15) {
      this.validationErrors.push(new ConfigValidationError(
        'BCRYPT_ROUNDS',
        'Must be between 10 and 15',
        config.security.bcryptRounds
      ));
    }

    // Throw if there are validation errors
    if (this.validationErrors.length > 0) {
      const errorMessages = this.validationErrors.map(e => e.message).join('\n');
      throw new Error(`Configuration validation failed:\n${errorMessages}`);
    }
  }

  /**
   * Log configuration summary (without sensitive information)
   */
  private logConfigurationSummary(config: AppConfig): void {
    const summary = {
      environment: config.environment,
      nodeVersion: config.nodeVersion,
      server: {
        port: config.server.port,
        host: config.server.host,
        ssl: config.server.ssl
      },
      database: {
        type: config.database.type,
        poolSize: config.database.poolSize,
        timeout: config.database.timeout
      },
      logging: {
        level: config.logging.level,
        destination: config.logging.destination
      },
      features: config.features
    };

    console.log('Configuration loaded successfully:', JSON.stringify(summary, null, 2));
  }

  /**
   * Get validation errors (if any)
   */
  getValidationErrors(): ConfigValidationError[] {
    return this.validationErrors;
  }

  /**
   * Check if configuration is valid
   */
  isValid(): boolean {
    return this.validationErrors.length === 0;
  }

  /**
   * Reload configuration (useful for testing or hot-reloading)
   */
  async reloadConfig(): Promise<AppConfig> {
    this.config = null;
    this.validationErrors = [];
    return this.loadConfig();
  }

  /**
   * Get environment-specific database connection string
   */
  getDatabaseConnectionString(): string {
    const config = this.getConfig();
    return config.database.connectionString;
  }

  /**
   * Check if feature is enabled
   */
  isFeatureEnabled(feature: keyof AppConfig['features']): boolean {
    const config = this.getConfig();
    return config.features[feature];
  }

  /**
   * Get logging configuration for the current environment
   */
  getLoggingConfig(): LoggingConfig {
    const config = this.getConfig();
    return config.logging;
  }

  /**
   * Get security configuration
   */
  getSecurityConfig(): Omit<SecurityConfig, 'jwtSecret' | 'sessionSecret'> {
    const config = this.getConfig();
    return {
      bcryptRounds: config.security.bcryptRounds,
      rateLimitWindow: config.security.rateLimitWindow,
      rateLimitMax: config.security.rateLimitMax,
      csrfProtection: config.security.csrfProtection
    };
  }
}

// Export singleton instance
export const configManager = ConfigManager.getInstance();

// Export convenience functions
export const loadConfig = () => configManager.loadConfig();
export const getConfig = () => configManager.getConfig();
export const isFeatureEnabled = (feature: keyof AppConfig['features']) => 
  configManager.isFeatureEnabled(feature);