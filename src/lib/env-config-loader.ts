/**
 * Environment-Specific Configuration Loader
 * Loads configuration files based on environment and merges with environment variables
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { configManager, type AppConfig } from './config';
import { validateEnvironment, type ValidationResult } from './env-validator';

export interface ConfigFile {
  database?: Partial<AppConfig['database']>;
  server?: Partial<AppConfig['server']>;
  logging?: Partial<AppConfig['logging']>;
  security?: Partial<AppConfig['security']>;
  features?: Partial<AppConfig['features']>;
}

export interface LoaderOptions {
  configDir?: string;
  validateEnv?: boolean;
  throwOnValidationError?: boolean;
  logLevel?: 'silent' | 'minimal' | 'verbose';
}

/**
 * Environment configuration loader
 */
export class EnvConfigLoader {
  private configDir: string;
  private validateEnv: boolean;
  private throwOnValidationError: boolean;
  private logLevel: 'silent' | 'minimal' | 'verbose';

  constructor(options: LoaderOptions = {}) {
    this.configDir = options.configDir || process.cwd();
    this.validateEnv = options.validateEnv ?? true;
    this.throwOnValidationError = options.throwOnValidationError ?? true;
    this.logLevel = options.logLevel || 'minimal';
  }

  /**
   * Load configuration for the current environment
   */
  async loadConfiguration(): Promise<AppConfig> {
    const environment = process.env.NODE_ENV || 'development';
    
    this.log('verbose', `Loading configuration for environment: ${environment}`);

    // Step 1: Validate environment variables
    if (this.validateEnv) {
      const validation = this.validateEnvironmentVariables();
      if (!validation.isValid && this.throwOnValidationError) {
        throw new Error(`Environment validation failed:\n${validation.errors.join('\n')}`);
      }
    }

    // Step 2: Load base configuration file
    const baseConfig = this.loadConfigFile('config.json');
    
    // Step 3: Load environment-specific configuration file
    const envConfig = this.loadConfigFile(`config.${environment}.json`);
    
    // Step 4: Load local override configuration file
    const localConfig = this.loadConfigFile('config.local.json');

    // Step 5: Merge configurations (local overrides env, env overrides base)
    const fileConfig = this.mergeConfigurations(baseConfig, envConfig, localConfig);

    // Step 6: Load configuration from environment variables
    const appConfig = await configManager.loadConfig();

    // Step 7: Apply file-based overrides to environment-based config
    const finalConfig = this.applyConfigOverrides(appConfig, fileConfig);

    this.log('minimal', 'Configuration loaded successfully');
    this.log('verbose', `Final configuration: ${JSON.stringify(this.sanitizeConfig(finalConfig), null, 2)}`);

    return finalConfig;
  }

  /**
   * Validate environment variables
   */
  private validateEnvironmentVariables(): ValidationResult {
    const validation = validateEnvironment();
    
    if (validation.errors.length > 0) {
      this.log('minimal', `Environment validation errors: ${validation.errors.length}`);
      validation.errors.forEach(error => this.log('verbose', `  - ${error}`));
    }

    if (validation.warnings.length > 0) {
      this.log('minimal', `Environment validation warnings: ${validation.warnings.length}`);
      validation.warnings.forEach(warning => this.log('verbose', `  - ${warning}`));
    }

    return validation;
  }

  /**
   * Load configuration file if it exists
   */
  private loadConfigFile(filename: string): ConfigFile | null {
    const filepath = join(this.configDir, filename);
    
    if (!existsSync(filepath)) {
      this.log('verbose', `Configuration file not found: ${filename}`);
      return null;
    }

    try {
      const content = readFileSync(filepath, 'utf-8');
      const config = JSON.parse(content) as ConfigFile;
      this.log('verbose', `Loaded configuration file: ${filename}`);
      return config;
    } catch (error) {
      this.log('minimal', `Failed to load configuration file ${filename}: ${error}`);
      if (this.throwOnValidationError) {
        throw new Error(`Invalid JSON in configuration file ${filename}: ${error}`);
      }
      return null;
    }
  }

  /**
   * Merge multiple configuration objects
   */
  private mergeConfigurations(...configs: (ConfigFile | null)[]): ConfigFile {
    const result: ConfigFile = {};

    for (const config of configs) {
      if (!config) continue;

      if (config.database) {
        result.database = { ...result.database, ...config.database };
      }
      if (config.server) {
        result.server = { ...result.server, ...config.server };
      }
      if (config.logging) {
        result.logging = { ...result.logging, ...config.logging };
      }
      if (config.security) {
        result.security = { ...result.security, ...config.security };
      }
      if (config.features) {
        result.features = { ...result.features, ...config.features };
      }
    }

    return result;
  }

  /**
   * Apply file-based configuration overrides to the main config
   */
  private applyConfigOverrides(appConfig: AppConfig, fileConfig: ConfigFile): AppConfig {
    const result = { ...appConfig };

    if (fileConfig.database) {
      result.database = { ...result.database, ...fileConfig.database };
    }
    if (fileConfig.server) {
      result.server = { ...result.server, ...fileConfig.server };
    }
    if (fileConfig.logging) {
      result.logging = { ...result.logging, ...fileConfig.logging };
    }
    if (fileConfig.security) {
      // Don't override secrets from files for security reasons
      const { jwtSecret, sessionSecret, ...securityOverrides } = fileConfig.security;
      result.security = { ...result.security, ...securityOverrides };
    }
    if (fileConfig.features) {
      result.features = { ...result.features, ...fileConfig.features };
    }

    return result;
  }

  /**
   * Remove sensitive information from config for logging
   */
  private sanitizeConfig(config: AppConfig): any {
    return {
      ...config,
      security: {
        ...config.security,
        jwtSecret: '***',
        sessionSecret: '***'
      },
      database: {
        ...config.database,
        connectionString: this.sanitizeConnectionString(config.database.connectionString)
      }
    };
  }

  /**
   * Sanitize database connection string for logging
   */
  private sanitizeConnectionString(connectionString: string): string {
    try {
      const url = new URL(connectionString);
      if (url.password) {
        url.password = '***';
      }
      return url.toString();
    } catch {
      // If it's not a URL, just hide potential passwords
      return connectionString.replace(/(password|pwd)=([^;&\s]+)/gi, '$1=***');
    }
  }

  /**
   * Log message based on log level
   */
  private log(level: 'silent' | 'minimal' | 'verbose', message: string): void {
    if (this.logLevel === 'silent') return;
    if (level === 'verbose' && this.logLevel !== 'verbose') return;
    
    console.log(`[EnvConfigLoader] ${message}`);
  }

  /**
   * Create example configuration files
   */
  static createExampleConfigs(configDir: string = process.cwd()): void {
    const examples = {
      'config.example.json': {
        database: {
          poolSize: 10,
          timeout: 5000,
          retryAttempts: 3
        },
        server: {
          port: 3000,
          host: "0.0.0.0",
          ssl: false,
          cors: {
            origin: ["http://localhost:3000"],
            credentials: true
          }
        },
        logging: {
          level: "info",
          destination: "console",
          rotation: false
        },
        features: {
          enableAnalytics: false,
          enableCaching: true,
          enableCompression: true,
          enableHealthChecks: true
        }
      },
      'config.development.example.json': {
        logging: {
          level: "debug",
          destination: "console"
        },
        features: {
          enableAnalytics: false
        }
      },
      'config.production.example.json': {
        server: {
          ssl: true
        },
        logging: {
          level: "warn",
          destination: "file",
          rotation: true
        },
        features: {
          enableAnalytics: true,
          enableCompression: true
        }
      }
    };

    for (const [filename, config] of Object.entries(examples)) {
      const filepath = join(configDir, filename);
      try {
        require('fs').writeFileSync(filepath, JSON.stringify(config, null, 2));
        console.log(`Created example configuration file: ${filename}`);
      } catch (error) {
        console.error(`Failed to create ${filename}:`, error);
      }
    }
  }
}

/**
 * Create and configure the environment config loader
 */
export function createConfigLoader(options?: LoaderOptions): EnvConfigLoader {
  return new EnvConfigLoader(options);
}

/**
 * Load configuration using default settings
 */
export async function loadEnvironmentConfig(): Promise<AppConfig> {
  const loader = createConfigLoader();
  return loader.loadConfiguration();
}