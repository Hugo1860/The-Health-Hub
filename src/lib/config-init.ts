/**
 * Configuration Initialization
 * Handles application startup configuration loading and validation
 */

import { loadEnvironmentConfig } from './env-config-loader';
import { configManager, type AppConfig } from './config';

export interface InitializationResult {
  success: boolean;
  config?: AppConfig;
  errors: string[];
  warnings: string[];
  startupTime: number;
}

/**
 * Initialize application configuration
 */
export async function initializeConfiguration(): Promise<InitializationResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const warnings: string[] = [];

  try {
    console.log('🔧 Initializing application configuration...');

    // Load and validate configuration
    const config = await loadEnvironmentConfig();

    // Perform additional startup validations
    await performStartupValidations(config, warnings);

    const endTime = Date.now();
    const startupTime = endTime - startTime;

    console.log(`✅ Configuration initialized successfully in ${startupTime}ms`);
    
    if (warnings.length > 0) {
      console.warn(`⚠️  Configuration warnings (${warnings.length}):`);
      warnings.forEach(warning => console.warn(`   - ${warning}`));
    }

    return {
      success: true,
      config,
      errors,
      warnings,
      startupTime
    };

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    errors.push(errorMessage);

    console.error('❌ Configuration initialization failed:', errorMessage);

    return {
      success: false,
      errors,
      warnings,
      startupTime: Date.now() - startTime
    };
  }
}

/**
 * Perform additional startup validations
 */
async function performStartupValidations(config: AppConfig, warnings: string[]): Promise<void> {
  // Validate database connection
  await validateDatabaseConnection(config, warnings);

  // Validate file system permissions
  validateFileSystemPermissions(config, warnings);

  // Validate security settings
  validateSecuritySettings(config, warnings);

  // Validate feature compatibility
  validateFeatureCompatibility(config, warnings);
}

/**
 * Validate database connection
 */
async function validateDatabaseConnection(config: AppConfig, warnings: string[]): Promise<void> {
  try {
    // Import database module dynamically to avoid circular dependencies
    const { testDatabaseConnection } = await import('./db-robust');
    
    const isConnected = await testDatabaseConnection();
    if (!isConnected) {
      warnings.push('Database connection test failed - application may not function properly');
    }
  } catch (error) {
    warnings.push(`Database validation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Validate file system permissions
 */
function validateFileSystemPermissions(config: AppConfig, warnings: string[]): void {
  const fs = require('fs');
  const path = require('path');

  // Check uploads directory
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  try {
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir, { recursive: true });
    }
    
    // Test write permissions
    const testFile = path.join(uploadsDir, '.write-test');
    fs.writeFileSync(testFile, 'test');
    fs.unlinkSync(testFile);
  } catch (error) {
    warnings.push('Uploads directory is not writable - file uploads may fail');
  }

  // Check logs directory if file logging is enabled
  if (config.logging.destination === 'file' || config.logging.destination === 'both') {
    const logsDir = path.join(process.cwd(), 'logs');
    try {
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      const testFile = path.join(logsDir, '.write-test');
      fs.writeFileSync(testFile, 'test');
      fs.unlinkSync(testFile);
    } catch (error) {
      warnings.push('Logs directory is not writable - file logging may fail');
    }
  }
}

/**
 * Validate security settings
 */
function validateSecuritySettings(config: AppConfig, warnings: string[]): void {
  // Check for development secrets in production
  if (config.environment === 'production') {
    if (config.security.jwtSecret.includes('development') || 
        config.security.jwtSecret.includes('test')) {
      warnings.push('JWT secret appears to be a development/test value in production');
    }

    if (config.security.sessionSecret.includes('development') || 
        config.security.sessionSecret.includes('test')) {
      warnings.push('Session secret appears to be a development/test value in production');
    }

    // Check CORS settings
    if (config.server.cors.origin.some(origin => origin.includes('localhost'))) {
      warnings.push('CORS configuration includes localhost origins in production');
    }

    // Check SSL settings
    if (!config.server.ssl) {
      warnings.push('SSL is disabled in production environment');
    }
  }

  // Check bcrypt rounds
  if (config.security.bcryptRounds < 12 && config.environment === 'production') {
    warnings.push('bcrypt rounds are below recommended value (12) for production');
  }
}

/**
 * Validate feature compatibility
 */
function validateFeatureCompatibility(config: AppConfig, warnings: string[]): void {
  // Check Node.js version compatibility
  const nodeVersion = process.version;
  const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);
  
  if (majorVersion < 18) {
    warnings.push(`Node.js version ${nodeVersion} is below recommended minimum (18.x)`);
  }

  // Check feature dependencies
  if (config.features.enableAnalytics && config.environment === 'development') {
    warnings.push('Analytics is enabled in development environment');
  }

  // PostgreSQL handles caching efficiently
  if (config.features.enableCaching) {
    warnings.push('Caching is enabled - monitor memory usage');
  }
}

/**
 * Create configuration health check
 */
export function createConfigHealthCheck() {
  return {
    name: 'configuration',
    check: async () => {
      try {
        const config = configManager.getConfig();
        const isValid = configManager.isValid();
        
        return {
          status: isValid ? 'healthy' : 'unhealthy',
          details: {
            environment: config.environment,
            nodeVersion: config.nodeVersion,
            validationErrors: configManager.getValidationErrors().length
          }
        };
      } catch (error) {
        return {
          status: 'unhealthy',
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }
  };
}

/**
 * Export configuration for use in other modules
 */
export function getInitializedConfig(): AppConfig {
  try {
    return configManager.getConfig();
  } catch (error) {
    throw new Error('Configuration not initialized. Call initializeConfiguration() first.');
  }
}

/**
 * Graceful shutdown handler that can clean up configuration resources
 */
export function setupConfigurationShutdown(): void {
  const cleanup = () => {
    console.log('🔧 Cleaning up configuration resources...');
    // Add any cleanup logic here if needed
  };

  process.on('SIGTERM', cleanup);
  process.on('SIGINT', cleanup);
  process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception during configuration:', error);
    cleanup();
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('❌ Unhandled rejection during configuration:', reason);
    cleanup();
    process.exit(1);
  });
}