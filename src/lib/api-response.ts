import { NextResponse } from 'next/server';

// 标准化的API响应类型
export interface ApiErrorResponse {
  error: string;
  details?: any;
  code?: string;
}

export interface ApiSuccessResponse<T = any> {
  message?: string;
  data?: T;
  [key: string]: any;
}

// 标准化错误响应工具类
export class ApiResponse {
  // 404 Not Found
  static notFound(message: string = 'Resource not found', details?: any): NextResponse {
    return NextResponse.json(
      { error: message, details } as ApiErrorResponse,
      { status: 404 }
    );
  }

  // 400 Bad Request
  static badRequest(message: string = 'Invalid input data', details?: any): NextResponse {
    return NextResponse.json(
      { error: message, details } as ApiErrorResponse,
      { status: 400 }
    );
  }

  // 401 Unauthorized
  static unauthorized(message: string = 'Authentication required'): NextResponse {
    return NextResponse.json(
      { error: message } as ApiErrorResponse,
      { status: 401 }
    );
  }

  // 403 Forbidden
  static forbidden(message: string = 'Insufficient permissions'): NextResponse {
    return NextResponse.json(
      { error: message } as ApiErrorResponse,
      { status: 403 }
    );
  }

  // 500 Internal Server Error
  static internalError(message: string = 'Internal server error', details?: any): NextResponse {
    return NextResponse.json(
      { error: message, details } as ApiErrorResponse,
      { status: 500 }
    );
  }

  // 成功响应
  static success<T = any>(data?: T, message?: string): NextResponse {
    const response: ApiSuccessResponse<T> = {};
    if (data !== undefined) response.data = data;
    if (message) response.message = message;
    
    // 如果只有简单数据，直接返回数据
    if (data !== undefined && !message) {
      return NextResponse.json(data);
    }
    
    return NextResponse.json(response);
  }

  // 创建响应（201 Created）
  static created<T = any>(data?: T, message?: string): NextResponse {
    const response: ApiSuccessResponse<T> = {};
    if (data !== undefined) response.data = data;
    if (message) response.message = message;
    
    return NextResponse.json(response, { status: 201 });
  }
}

// 数据库错误处理工具
export class DatabaseErrorHandler {
  static handle(error: any, operation: string = 'Database operation'): NextResponse {
    console.error(`${operation} failed:`, error);
    
    // 根据错误类型返回不同的响应
    if (error.code === '23505' || error.code === '23503') { // PostgreSQL constraint errors
      return ApiResponse.badRequest('Data constraint violation', { 
        code: error.code,
        operation 
      });
    }
    
    return ApiResponse.internalError(`${operation} failed`);
  }
}