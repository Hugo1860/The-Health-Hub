/**
 * Configuration System Tests
 * Tests for the environment configuration management system
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { ConfigManager, ConfigValidationError } from '../config';
import { EnvValidator, validateEnvironment } from '../env-validator';
import { resetConfigurationState } from '../config-integration';

// Mock environment variables
const originalEnv = process.env;

describe('Configuration System', () => {
  beforeEach(() => {
    // Reset environment
    process.env = { ...originalEnv };
    resetConfigurationState();
  });

  afterEach(() => {
    // Restore original environment
    process.env = originalEnv;
  });

  describe('ConfigManager', () => {
    it('should load configuration with required environment variables', async () => {
      // Set required environment variables
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'sqlite://./test.db';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';
      process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-validation';

      const configManager = ConfigManager.getInstance();
      const config = await configManager.loadConfig();

      expect(config).toBeDefined();
      expect(config.environment).toBe('development');
      expect(config.database.connectionString).toBe('sqlite://./test.db');
      expect(config.security.jwtSecret).toBe('test-jwt-secret-that-is-long-enough-for-validation');
    });

    it('should throw error for missing required environment variables', async () => {
      // Don't set required variables
      process.env.NODE_ENV = 'development';

      const configManager = ConfigManager.getInstance();
      
      await expect(configManager.loadConfig()).rejects.toThrow('Missing required environment variables');
    });

    it('should use default values for optional configuration', async () => {
      // Set only required variables
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'sqlite://./test.db';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';
      process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-validation';

      const configManager = ConfigManager.getInstance();
      const config = await configManager.loadConfig();

      expect(config.server.port).toBe(3000); // Default value
      expect(config.database.poolSize).toBe(10); // Default value
      expect(config.logging.level).toBe('info'); // Default value
    });

    it('should validate configuration values', async () => {
      // Set invalid values
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'sqlite://./test.db';
      process.env.JWT_SECRET = 'short'; // Too short
      process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-validation';
      process.env.PORT = '99999'; // Invalid port

      const configManager = ConfigManager.getInstance();
      
      await expect(configManager.loadConfig()).rejects.toThrow('Configuration validation failed');
    });
  });

  describe('EnvValidator', () => {
    it('should validate string values correctly', () => {
      const validator = new EnvValidator()
        .rule('TEST_STRING', {
          required: true,
          type: 'string',
          min: 5,
          max: 20
        });

      process.env.TEST_STRING = 'valid_string';
      const result = validator.validate();

      expect(result.isValid).toBe(true);
      expect(result.values.TEST_STRING).toBe('valid_string');
    });

    it('should validate number values correctly', () => {
      const validator = new EnvValidator()
        .rule('TEST_NUMBER', {
          required: true,
          type: 'number',
          min: 1,
          max: 100
        });

      process.env.TEST_NUMBER = '50';
      const result = validator.validate();

      expect(result.isValid).toBe(true);
      expect(result.values.TEST_NUMBER).toBe(50);
    });

    it('should validate boolean values correctly', () => {
      const validator = new EnvValidator()
        .rule('TEST_BOOLEAN', {
          type: 'boolean',
          default: false
        });

      process.env.TEST_BOOLEAN = 'true';
      const result = validator.validate();

      expect(result.isValid).toBe(true);
      expect(result.values.TEST_BOOLEAN).toBe(true);
    });

    it('should validate URL values correctly', () => {
      const validator = new EnvValidator()
        .rule('TEST_URL', {
          type: 'url',
          required: true
        });

      process.env.TEST_URL = 'https://example.com';
      const result = validator.validate();

      expect(result.isValid).toBe(true);
      expect(result.values.TEST_URL).toBe('https://example.com');
    });

    it('should handle validation errors correctly', () => {
      const validator = new EnvValidator()
        .rule('TEST_REQUIRED', {
          required: true,
          type: 'string'
        })
        .rule('TEST_NUMBER', {
          type: 'number',
          min: 10
        });

      // Don't set TEST_REQUIRED, set invalid TEST_NUMBER
      process.env.TEST_NUMBER = '5';

      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors[0]).toContain('TEST_REQUIRED');
      expect(result.errors[1]).toContain('TEST_NUMBER');
    });

    it('should use default values when variables are not set', () => {
      const validator = new EnvValidator()
        .rule('TEST_WITH_DEFAULT', {
          type: 'string',
          default: 'default_value'
        });

      const result = validator.validate();

      expect(result.isValid).toBe(true);
      expect(result.values.TEST_WITH_DEFAULT).toBe('default_value');
    });

    it('should apply custom transformations', () => {
      const validator = new EnvValidator()
        .rule('TEST_TRANSFORM', {
          type: 'string',
          transform: (value: string) => value.toUpperCase()
        });

      process.env.TEST_TRANSFORM = 'lowercase';
      const result = validator.validate();

      expect(result.isValid).toBe(true);
      expect(result.values.TEST_TRANSFORM).toBe('LOWERCASE');
    });

    it('should apply custom validation functions', () => {
      const validator = new EnvValidator()
        .rule('TEST_CUSTOM', {
          type: 'string',
          validate: (value: string) => value.startsWith('prefix_') || 'Must start with prefix_'
        });

      process.env.TEST_CUSTOM = 'invalid_value';
      const result = validator.validate();

      expect(result.isValid).toBe(false);
      expect(result.errors[0]).toContain('Must start with prefix_');
    });
  });

  describe('Environment Validation', () => {
    it('should validate application environment variables', () => {
      // Set valid environment variables
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'sqlite://./test.db';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';
      process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-validation';
      process.env.PORT = '3000';

      const result = validateEnvironment();

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required variables', () => {
      // Only set some required variables
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'sqlite://./test.db';
      // Missing JWT_SECRET and SESSION_SECRET

      const result = validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should validate database URL format', () => {
      process.env.NODE_ENV = 'development';
      process.env.DATABASE_URL = 'invalid-url';
      process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';
      process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-validation';

      const result = validateEnvironment();

      expect(result.isValid).toBe(false);
      expect(result.errors.some(error => error.includes('DATABASE_URL'))).toBe(true);
    });
  });
});

describe('Configuration Integration', () => {
  beforeEach(() => {
    // Set up valid environment for integration tests
    process.env.NODE_ENV = 'test';
    process.env.DATABASE_URL = 'sqlite://./test.db';
    process.env.JWT_SECRET = 'test-jwt-secret-that-is-long-enough-for-validation';
    process.env.SESSION_SECRET = 'test-session-secret-that-is-long-enough-for-validation';
    resetConfigurationState();
  });

  it('should provide easy access to configuration sections', async () => {
    const { DatabaseConfig, ServerConfig, SecurityConfig } = await import('../config-integration');

    const connectionString = await DatabaseConfig.getConnectionString();
    const port = await ServerConfig.getPort();
    const jwtSecret = await SecurityConfig.getJWTSecret();

    expect(connectionString).toBe('sqlite://./test.db');
    expect(port).toBe(3000);
    expect(jwtSecret).toBe('test-jwt-secret-that-is-long-enough-for-validation');
  });
});