// PostgreSQL错误处理系统

import { DatabaseError } from 'pg';

// PostgreSQL错误类型枚举
export enum PostgreSQLErrorType {
  CONNECTION = 'CONNECTION',
  QUERY = 'QUERY',
  TRANSACTION = 'TRANSACTION',
  CONSTRAINT = 'CONSTRAINT',
  PERMISSION = 'PERMISSION',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN'
}

// PostgreSQL错误代码映射
export const PostgreSQLErrorCodes = {
  // 连接错误
  CONNECTION_EXCEPTION: '08000',
  CONNECTION_DOES_NOT_EXIST: '08003',
  CONNECTION_FAILURE: '08006',
  
  // 语法错误
  SYNTAX_ERROR: '42601',
  UNDEFINED_TABLE: '42P01',
  UNDEFINED_COLUMN: '42703',
  UNDEFINED_FUNCTION: '42883',
  
  // 约束违反
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  
  // 权限错误
  INSUFFICIENT_PRIVILEGE: '42501',
  
  // 数据类型错误
  INVALID_TEXT_REPRESENTATION: '22P02',
  NUMERIC_VALUE_OUT_OF_RANGE: '22003',
  
  // 事务错误
  SERIALIZATION_FAILURE: '40001',
  DEADLOCK_DETECTED: '40P01',
  
  // 系统错误
  DISK_FULL: '53100',
  OUT_OF_MEMORY: '53200',
  TOO_MANY_CONNECTIONS: '53300'
} as const;

// 标准化的PostgreSQL错误接口
export interface PostgreSQLError {
  type: PostgreSQLErrorType;
  code: string;
  message: string;
  detail?: string;
  hint?: string;
  position?: string;
  internalPosition?: string;
  internalQuery?: string;
  where?: string;
  schema?: string;
  table?: string;
  column?: string;
  dataType?: string;
  constraint?: string;
  file?: string;
  line?: string;
  routine?: string;
  severity?: string;
  sqlState?: string;
  originalError?: any;
  query?: string;
  parameters?: any[];
  timestamp: string;
  requestId?: string;
}

// PostgreSQL错误处理器类
export class PostgreSQLErrorHandler {
  
  /**
   * 解析PostgreSQL错误
   */
  static parseError(error: any, query?: string, parameters?: any[], requestId?: string): PostgreSQLError {
    const timestamp = new Date().toISOString();
    
    // 如果是PostgreSQL数据库错误
    if (error instanceof DatabaseError || (error && error.code && error.severity)) {
      return {
        type: this.determineErrorType(error.code),
        code: error.code || 'UNKNOWN',
        message: error.message || 'Unknown PostgreSQL error',
        detail: error.detail,
        hint: error.hint,
        position: error.position,
        internalPosition: error.internalPosition,
        internalQuery: error.internalQuery,
        where: error.where,
        schema: error.schema,
        table: error.table,
        column: error.column,
        dataType: error.dataType,
        constraint: error.constraint,
        file: error.file,
        line: error.line,
        routine: error.routine,
        severity: error.severity,
        sqlState: error.code,
        originalError: error,
        query,
        parameters,
        timestamp,
        requestId
      };
    }
    
    // 如果是连接错误
    if (error && (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND' || error.code === 'ETIMEDOUT')) {
      return {
        type: PostgreSQLErrorType.CONNECTION,
        code: error.code,
        message: `Connection error: ${error.message}`,
        originalError: error,
        query,
        parameters,
        timestamp,
        requestId
      };
    }
    
    // 通用错误
    return {
      type: PostgreSQLErrorType.UNKNOWN,
      code: 'UNKNOWN',
      message: error instanceof Error ? error.message : 'Unknown error',
      originalError: error,
      query,
      parameters,
      timestamp,
      requestId
    };
  }
  
  /**
   * 根据错误代码确定错误类型
   */
  private static determineErrorType(code: string): PostgreSQLErrorType {
    if (!code) return PostgreSQLErrorType.UNKNOWN;
    
    // 连接错误 (08xxx)
    if (code.startsWith('08')) {
      return PostgreSQLErrorType.CONNECTION;
    }
    
    // 语法和权限错误 (42xxx)
    if (code.startsWith('42')) {
      return code === PostgreSQLErrorCodes.INSUFFICIENT_PRIVILEGE 
        ? PostgreSQLErrorType.PERMISSION 
        : PostgreSQLErrorType.QUERY;
    }
    
    // 约束违反 (23xxx)
    if (code.startsWith('23')) {
      return PostgreSQLErrorType.CONSTRAINT;
    }
    
    // 事务错误 (40xxx)
    if (code.startsWith('40')) {
      return PostgreSQLErrorType.TRANSACTION;
    }
    
    // 系统资源错误 (53xxx)
    if (code.startsWith('53')) {
      return PostgreSQLErrorType.CONNECTION;
    }
    
    return PostgreSQLErrorType.QUERY;
  }
  
  /**
   * 生成用户友好的错误消息
   */
  static getUserFriendlyMessage(pgError: PostgreSQLError): string {
    switch (pgError.code) {
      case PostgreSQLErrorCodes.CONNECTION_EXCEPTION:
      case PostgreSQLErrorCodes.CONNECTION_FAILURE:
        return '数据库连接失败，请稍后重试';
        
      case PostgreSQLErrorCodes.TOO_MANY_CONNECTIONS:
        return '数据库连接数过多，请稍后重试';
        
      case PostgreSQLErrorCodes.UNDEFINED_TABLE:
        return `表 "${pgError.table || 'unknown'}" 不存在`;
        
      case PostgreSQLErrorCodes.UNDEFINED_COLUMN:
        return `列 "${pgError.column || 'unknown'}" 不存在`;
        
      case PostgreSQLErrorCodes.SYNTAX_ERROR:
        return 'SQL语法错误';
        
      case PostgreSQLErrorCodes.UNIQUE_VIOLATION:
        return `数据重复，${pgError.constraint ? `约束: ${pgError.constraint}` : ''}`;
        
      case PostgreSQLErrorCodes.FOREIGN_KEY_VIOLATION:
        return `外键约束违反，${pgError.constraint ? `约束: ${pgError.constraint}` : ''}`;
        
      case PostgreSQLErrorCodes.NOT_NULL_VIOLATION:
        return `必填字段不能为空，${pgError.column ? `字段: ${pgError.column}` : ''}`;
        
      case PostgreSQLErrorCodes.INSUFFICIENT_PRIVILEGE:
        return '权限不足，无法执行此操作';
        
      case PostgreSQLErrorCodes.INVALID_TEXT_REPRESENTATION:
        return '数据格式错误';
        
      case PostgreSQLErrorCodes.SERIALIZATION_FAILURE:
        return '事务冲突，请重试';
        
      case PostgreSQLErrorCodes.DEADLOCK_DETECTED:
        return '检测到死锁，请重试';
        
      case PostgreSQLErrorCodes.DISK_FULL:
        return '磁盘空间不足';
        
      case PostgreSQLErrorCodes.OUT_OF_MEMORY:
        return '内存不足';
        
      default:
        if (pgError.type === PostgreSQLErrorType.CONNECTION) {
          return '数据库连接问题';
        }
        return pgError.message || '数据库操作失败';
    }
  }
  
  /**
   * 判断错误是否可重试
   */
  static isRetryable(pgError: PostgreSQLError): boolean {
    const retryableCodes = [
      PostgreSQLErrorCodes.CONNECTION_EXCEPTION,
      PostgreSQLErrorCodes.CONNECTION_FAILURE,
      PostgreSQLErrorCodes.SERIALIZATION_FAILURE,
      PostgreSQLErrorCodes.DEADLOCK_DETECTED,
      PostgreSQLErrorCodes.TOO_MANY_CONNECTIONS
    ];
    
    return retryableCodes.includes(pgError.code as any) || 
           pgError.type === PostgreSQLErrorType.CONNECTION;
  }
  
  /**
   * 获取错误的严重程度
   */
  static getSeverity(pgError: PostgreSQLError): 'low' | 'medium' | 'high' | 'critical' {
    switch (pgError.type) {
      case PostgreSQLErrorType.CONNECTION:
        return 'high';
      case PostgreSQLErrorType.PERMISSION:
        return 'medium';
      case PostgreSQLErrorType.CONSTRAINT:
        return 'low';
      case PostgreSQLErrorType.TRANSACTION:
        return 'medium';
      case PostgreSQLErrorType.TIMEOUT:
        return 'medium';
      default:
        return 'low';
    }
  }
  
  /**
   * 记录错误日志
   */
  static logError(pgError: PostgreSQLError, context?: any): void {
    const severity = this.getSeverity(pgError);
    const logLevel = severity === 'critical' || severity === 'high' ? 'error' : 
                    severity === 'medium' ? 'warn' : 'info';
    
    const logData = {
      timestamp: pgError.timestamp,
      requestId: pgError.requestId,
      type: pgError.type,
      code: pgError.code,
      message: pgError.message,
      severity,
      table: pgError.table,
      column: pgError.column,
      constraint: pgError.constraint,
      query: pgError.query?.substring(0, 200),
      context
    };
    
    const logMessage = `PostgreSQL Error [${pgError.type}:${pgError.code}]: ${pgError.message}`;
    
    switch (logLevel) {
      case 'error':
        console.error(logMessage, logData);
        break;
      case 'warn':
        console.warn(logMessage, logData);
        break;
      default:
        console.log(logMessage, logData);
    }
  }
  
  /**
   * 创建API错误响应
   */
  static createApiError(pgError: PostgreSQLError) {
    const userMessage = this.getUserFriendlyMessage(pgError);
    const isRetryable = this.isRetryable(pgError);
    
    return {
      success: false,
      error: {
        type: pgError.type,
        code: pgError.code,
        message: userMessage,
        retryable: isRetryable,
        timestamp: pgError.timestamp,
        requestId: pgError.requestId
      },
      debug: process.env.NODE_ENV === 'development' ? {
        originalMessage: pgError.message,
        detail: pgError.detail,
        hint: pgError.hint,
        query: pgError.query,
        parameters: pgError.parameters
      } : undefined
    };
  }
}

// 便捷函数
export function handlePostgreSQLError(
  error: any, 
  query?: string, 
  parameters?: any[], 
  requestId?: string,
  context?: any
) {
  const pgError = PostgreSQLErrorHandler.parseError(error, query, parameters, requestId);
  PostgreSQLErrorHandler.logError(pgError, context);
  return PostgreSQLErrorHandler.createApiError(pgError);
}

export function isPostgreSQLError(error: any): boolean {
  return error instanceof DatabaseError || 
         (error && error.code && error.severity) ||
         (error && error.code && ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT'].includes(error.code));
}

export default PostgreSQLErrorHandler;