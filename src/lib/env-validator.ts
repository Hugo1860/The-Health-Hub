/**
 * Environment Variable Validation Utility
 * Provides runtime validation and type checking for environment variables
 */

export interface ValidationRule {
  required?: boolean;
  type?: 'string' | 'number' | 'boolean' | 'url' | 'email' | 'json';
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  default?: any;
  transform?: (value: string) => any;
  validate?: (value: any) => boolean | string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  values: Record<string, any>;
}

/**
 * Environment variable validator
 */
export class EnvValidator {
  private rules: Record<string, ValidationRule> = {};
  private errors: string[] = [];
  private warnings: string[] = [];

  /**
   * Add validation rule for an environment variable
   */
  rule(name: string, rule: ValidationRule): this {
    this.rules[name] = rule;
    return this;
  }

  /**
   * Add multiple validation rules
   */
  rules(rules: Record<string, ValidationRule>): this {
    Object.assign(this.rules, rules);
    return this;
  }

  /**
   * Validate all configured environment variables
   */
  validate(): ValidationResult {
    this.errors = [];
    this.warnings = [];
    const values: Record<string, any> = {};

    for (const [name, rule] of Object.entries(this.rules)) {
      const rawValue = process.env[name];
      
      try {
        const validatedValue = this.validateVariable(name, rawValue, rule);
        values[name] = validatedValue;
      } catch (error) {
        this.errors.push(`${name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      isValid: this.errors.length === 0,
      errors: this.errors,
      warnings: this.warnings,
      values
    };
  }

  /**
   * Validate a single environment variable
   */
  private validateVariable(name: string, rawValue: string | undefined, rule: ValidationRule): any {
    // Check if required
    if (rule.required && !rawValue) {
      throw new Error('Required environment variable is missing');
    }

    // Use default if not provided
    if (!rawValue) {
      if (rule.default !== undefined) {
        return rule.default;
      }
      return undefined;
    }

    // Type conversion and validation
    let value: any = rawValue;

    switch (rule.type) {
      case 'number':
        value = this.validateNumber(rawValue, rule);
        break;
      case 'boolean':
        value = this.validateBoolean(rawValue);
        break;
      case 'url':
        value = this.validateUrl(rawValue);
        break;
      case 'email':
        value = this.validateEmail(rawValue);
        break;
      case 'json':
        value = this.validateJson(rawValue);
        break;
      case 'string':
      default:
        value = this.validateString(rawValue, rule);
        break;
    }

    // Apply custom transform
    if (rule.transform) {
      value = rule.transform(value);
    }

    // Apply custom validation
    if (rule.validate) {
      const result = rule.validate(value);
      if (result !== true) {
        throw new Error(typeof result === 'string' ? result : 'Custom validation failed');
      }
    }

    return value;
  }

  /**
   * Validate string value
   */
  private validateString(value: string, rule: ValidationRule): string {
    if (rule.min && value.length < rule.min) {
      throw new Error(`Must be at least ${rule.min} characters long`);
    }

    if (rule.max && value.length > rule.max) {
      throw new Error(`Must be no more than ${rule.max} characters long`);
    }

    if (rule.pattern && !rule.pattern.test(value)) {
      throw new Error(`Must match pattern ${rule.pattern}`);
    }

    if (rule.enum && !rule.enum.includes(value)) {
      throw new Error(`Must be one of: ${rule.enum.join(', ')}`);
    }

    return value;
  }

  /**
   * Validate number value
   */
  private validateNumber(value: string, rule: ValidationRule): number {
    const num = Number(value);
    
    if (isNaN(num)) {
      throw new Error('Must be a valid number');
    }

    if (rule.min !== undefined && num < rule.min) {
      throw new Error(`Must be at least ${rule.min}`);
    }

    if (rule.max !== undefined && num > rule.max) {
      throw new Error(`Must be no more than ${rule.max}`);
    }

    return num;
  }

  /**
   * Validate boolean value
   */
  private validateBoolean(value: string): boolean {
    const lower = value.toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(lower)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(lower)) {
      return false;
    }
    throw new Error('Must be a valid boolean (true/false, 1/0, yes/no, on/off)');
  }

  /**
   * Validate URL value
   */
  private validateUrl(value: string): string {
    try {
      new URL(value);
      return value;
    } catch {
      throw new Error('Must be a valid URL');
    }
  }

  /**
   * Validate email value
   */
  private validateEmail(value: string): string {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      throw new Error('Must be a valid email address');
    }
    return value;
  }

  /**
   * Validate JSON value
   */
  private validateJson(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      throw new Error('Must be valid JSON');
    }
  }

  /**
   * Add warning message
   */
  private addWarning(message: string): void {
    this.warnings.push(message);
  }
}

/**
 * Create environment validation rules for the application
 */
export function createAppValidationRules(): EnvValidator {
  return new EnvValidator()
    .rules({
      // Core application settings
      NODE_ENV: {
        required: true,
        type: 'string',
        enum: ['development', 'staging', 'production'],
        default: 'development'
      },
      
      // Server configuration
      PORT: {
        type: 'number',
        min: 1,
        max: 65535,
        default: 3000
      },
      HOST: {
        type: 'string',
        default: '0.0.0.0'
      },
      SSL_ENABLED: {
        type: 'boolean',
        default: false
      },
      
      // Database configuration
      DATABASE_URL: {
        required: true,
        type: 'string',
        min: 10,
        validate: (value: string) => {
          if (!value.includes('://')) {
            return 'Must be a valid database connection string';
          }
          return true;
        }
      },
      DB_POOL_SIZE: {
        type: 'number',
        min: 1,
        max: 100,
        default: 10
      },
      DB_TIMEOUT: {
        type: 'number',
        min: 1000,
        default: 5000
      },
      DB_RETRY_ATTEMPTS: {
        type: 'number',
        min: 0,
        max: 10,
        default: 3
      },
      
      // Security configuration
      JWT_SECRET: {
        required: true,
        type: 'string',
        min: 32,
        validate: (value: string) => {
          if (value === 'your-secret-key' || value === 'change-me') {
            return 'JWT_SECRET must be changed from default value';
          }
          return true;
        }
      },
      SESSION_SECRET: {
        required: true,
        type: 'string',
        min: 32,
        validate: (value: string) => {
          if (value === 'your-session-secret' || value === 'change-me') {
            return 'SESSION_SECRET must be changed from default value';
          }
          return true;
        }
      },
      BCRYPT_ROUNDS: {
        type: 'number',
        min: 10,
        max: 15,
        default: 12
      },
      
      // CORS configuration
      CORS_ORIGIN: {
        type: 'string',
        transform: (value: string) => value.split(',').map(o => o.trim()),
        default: 'http://localhost:3000'
      },
      CORS_CREDENTIALS: {
        type: 'boolean',
        default: true
      },
      
      // Logging configuration
      LOG_LEVEL: {
        type: 'string',
        enum: ['debug', 'info', 'warn', 'error'],
        default: 'info'
      },
      LOG_DESTINATION: {
        type: 'string',
        enum: ['console', 'file', 'both'],
        default: 'console'
      },
      LOG_ROTATION: {
        type: 'boolean',
        default: false
      },
      
      // Rate limiting
      RATE_LIMIT_WINDOW: {
        type: 'number',
        min: 60000, // 1 minute
        default: 900000 // 15 minutes
      },
      RATE_LIMIT_MAX: {
        type: 'number',
        min: 1,
        default: 100
      },
      
      // Feature flags
      ENABLE_ANALYTICS: {
        type: 'boolean',
        default: false
      },
      ENABLE_CACHING: {
        type: 'boolean',
        default: true
      },
      ENABLE_COMPRESSION: {
        type: 'boolean',
        default: true
      },
      ENABLE_HEALTH_CHECKS: {
        type: 'boolean',
        default: true
      }
    });
}

/**
 * Validate environment variables and return configuration
 */
export function validateEnvironment(): ValidationResult {
  const validator = createAppValidationRules();
  return validator.validate();
}