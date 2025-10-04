/**
 * Configuration Integration Utilities
 * Provides easy access to configuration in different parts of the application
 */

import { configManager, type AppConfig } from './config';
import { initializeConfiguration } from './config-init';

// Global configuration state
let isInitialized = false;
let initializationPromise: Promise<void> | null = null;

/**
 * Ensure configuration is initialized before use
 */
async function ensureConfigInitialized(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (initializationPromise) {
    return initializationPromise;
  }

  initializationPromise = (async () => {
    const result = await initializeConfiguration();
    if (!result.success) {
      throw new Error(`Configuration initialization failed: ${result.errors.join(', ')}`);
    }
    isInitialized = true;
  })();

  return initializationPromise;
}

/**
 * Get configuration with automatic initialization
 */
export async function getAppConfig(): Promise<AppConfig> {
  await ensureConfigInitialized();
  return configManager.getConfig();
}

/**
 * Get configuration synchronously (throws if not initialized)
 */
export function getAppConfigSync(): AppConfig {
  if (!isInitialized) {
    throw new Error('Configuration not initialized. Use getAppConfig() or call initializeConfiguration() first.');
  }
  return configManager.getConfig();
}

/**
 * Database configuration helpers
 */
export class DatabaseConfig {
  static async getConnectionString(): Promise<string> {
    const config = await getAppConfig();
    return config.database.connectionString;
  }

  static async getPoolSize(): Promise<number> {
    const config = await getAppConfig();
    return config.database.poolSize;
  }

  static async getTimeout(): Promise<number> {
    const config = await getAppConfig();
    return config.database.timeout;
  }

  static async getRetryAttempts(): Promise<number> {
    const config = await getAppConfig();
    return config.database.retryAttempts;
  }

  static getConnectionStringSync(): string {
    const config = getAppConfigSync();
    return config.database.connectionString;
  }

  static getPoolSizeSync(): number {
    const config = getAppConfigSync();
    return config.database.poolSize;
  }
}

/**
 * Server configuration helpers
 */
export class ServerConfig {
  static async getPort(): Promise<number> {
    const config = await getAppConfig();
    return config.server.port;
  }

  static async getHost(): Promise<string> {
    const config = await getAppConfig();
    return config.server.host;
  }

  static async getCorsOrigins(): Promise<string[]> {
    const config = await getAppConfig();
    return config.server.cors.origin;
  }

  static async isSSLEnabled(): Promise<boolean> {
    const config = await getAppConfig();
    return config.server.ssl;
  }

  static getPortSync(): number {
    const config = getAppConfigSync();
    return config.server.port;
  }

  static getHostSync(): string {
    const config = getAppConfigSync();
    return config.server.host;
  }
}

/**
 * Security configuration helpers
 */
export class SecurityConfig {
  static async getJWTSecret(): Promise<string> {
    const config = await getAppConfig();
    return config.security.jwtSecret;
  }

  static async getSessionSecret(): Promise<string> {
    const config = await getAppConfig();
    return config.security.sessionSecret;
  }

  static async getBcryptRounds(): Promise<number> {
    const config = await getAppConfig();
    return config.security.bcryptRounds;
  }

  static async getRateLimitConfig(): Promise<{ window: number; max: number }> {
    const config = await getAppConfig();
    return {
      window: config.security.rateLimitWindow,
      max: config.security.rateLimitMax
    };
  }

  static getJWTSecretSync(): string {
    const config = getAppConfigSync();
    return config.security.jwtSecret;
  }

  static getSessionSecretSync(): string {
    const config = getAppConfigSync();
    return config.security.sessionSecret;
  }
}

/**
 * Logging configuration helpers
 */
export class LoggingConfig {
  static async getLevel(): Promise<string> {
    const config = await getAppConfig();
    return config.logging.level;
  }

  static async getDestination(): Promise<string> {
    const config = await getAppConfig();
    return config.logging.destination;
  }

  static async shouldRotate(): Promise<boolean> {
    const config = await getAppConfig();
    return config.logging.rotation;
  }

  static getLevelSync(): string {
    const config = getAppConfigSync();
    return config.logging.level;
  }

  static getDestinationSync(): string {
    const config = getAppConfigSync();
    return config.logging.destination;
  }
}

/**
 * Feature flag helpers
 */
export class FeatureFlags {
  static async isAnalyticsEnabled(): Promise<boolean> {
    const config = await getAppConfig();
    return config.features.enableAnalytics;
  }

  static async isCachingEnabled(): Promise<boolean> {
    const config = await getAppConfig();
    return config.features.enableCaching;
  }

  static async isCompressionEnabled(): Promise<boolean> {
    const config = await getAppConfig();
    return config.features.enableCompression;
  }

  static async areHealthChecksEnabled(): Promise<boolean> {
    const config = await getAppConfig();
    return config.features.enableHealthChecks;
  }

  static isAnalyticsEnabledSync(): boolean {
    const config = getAppConfigSync();
    return config.features.enableAnalytics;
  }

  static isCachingEnabledSync(): boolean {
    const config = getAppConfigSync();
    return config.features.enableCaching;
  }

  static isCompressionEnabledSync(): boolean {
    const config = getAppConfigSync();
    return config.features.enableCompression;
  }

  static areHealthChecksEnabledSync(): boolean {
    const config = getAppConfigSync();
    return config.features.enableHealthChecks;
  }
}

/**
 * Environment helpers
 */
export class Environment {
  static async isDevelopment(): Promise<boolean> {
    const config = await getAppConfig();
    return config.environment === 'development';
  }

  static async isProduction(): Promise<boolean> {
    const config = await getAppConfig();
    return config.environment === 'production';
  }

  static async isStaging(): Promise<boolean> {
    const config = await getAppConfig();
    return config.environment === 'staging';
  }

  static async getEnvironment(): Promise<string> {
    const config = await getAppConfig();
    return config.environment;
  }

  static isDevelopmentSync(): boolean {
    const config = getAppConfigSync();
    return config.environment === 'development';
  }

  static isProductionSync(): boolean {
    const config = getAppConfigSync();
    return config.environment === 'production';
  }

  static isStagingSync(): boolean {
    const config = getAppConfigSync();
    return config.environment === 'staging';
  }

  static getEnvironmentSync(): string {
    const config = getAppConfigSync();
    return config.environment;
  }
}

/**
 * Configuration middleware for API routes
 */
export function withConfig<T extends any[]>(
  handler: (config: AppConfig, ...args: T) => Promise<any>
) {
  return async (...args: T) => {
    const config = await getAppConfig();
    return handler(config, ...args);
  };
}

/**
 * Configuration decorator for classes
 */
export function ConfigAware<T extends { new (...args: any[]): {} }>(constructor: T) {
  return class extends constructor {
    protected async getConfig(): Promise<AppConfig> {
      return getAppConfig();
    }

    protected getConfigSync(): AppConfig {
      return getAppConfigSync();
    }
  };
}

/**
 * Reset configuration state (useful for testing)
 */
export function resetConfigurationState(): void {
  isInitialized = false;
  initializationPromise = null;
}

/**
 * Check if configuration is initialized
 */
export function isConfigurationInitialized(): boolean {
  return isInitialized;
}