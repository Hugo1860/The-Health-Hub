import { NextRequest } from 'next/server';
import { z, ZodSchema, ZodError } from 'zod';
import { ApiErrors, ApiErrorClass } from './api-error-handler';

// 验证配置接口
export interface ValidationConfig {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
  headers?: ZodSchema;
}

// 验证结果接口
export interface ValidationResult<T = any> {
  body?: T;
  query?: T;
  params?: T;
  headers?: T;
}

// 请求验证器
export class RequestValidator {
  // 验证JSON请求体
  static async validateBody<T>(
    req: NextRequest,
    schema: ZodSchema<T>
  ): Promise<T> {
    try {
      const contentType = req.headers.get('content-type');
      
      if (!contentType?.includes('application/json')) {
        throw ApiErrors.BAD_REQUEST('Content-Type must be application/json');
      }

      const body = await req.json();
      return schema.parse(body);
    } catch (error) {
      if (error instanceof ZodError) {
        throw ApiErrors.VALIDATION_ERROR({
          field: 'body',
          issues: error.issues
        });
      }
      if (error instanceof ApiErrorClass) {
        throw error;
      }
      throw ApiErrors.BAD_REQUEST('Invalid JSON in request body');
    }
  }

  // 验证查询参数
  static validateQuery<T>(
    req: NextRequest,
    schema: ZodSchema<T>
  ): T {
    try {
      const query = Object.fromEntries(req.nextUrl.searchParams.entries());
      return schema.parse(query);
    } catch (error) {
      if (error instanceof ZodError) {
        throw ApiErrors.VALIDATION_ERROR({
          field: 'query',
          issues: error.issues
        });
      }
      throw error;
    }
  }

  // 验证路径参数
  static validateParams<T>(
    params: any,
    schema: ZodSchema<T>
  ): T {
    try {
      return schema.parse(params);
    } catch (error) {
      if (error instanceof ZodError) {
        throw ApiErrors.VALIDATION_ERROR({
          field: 'params',
          issues: error.issues
        });
      }
      throw error;
    }
  }

  // 验证请求头
  static validateHeaders<T>(
    req: NextRequest,
    schema: ZodSchema<T>
  ): T {
    try {
      const headers = Object.fromEntries(req.headers.entries());
      return schema.parse(headers);
    } catch (error) {
      if (error instanceof ZodError) {
        throw ApiErrors.VALIDATION_ERROR({
          field: 'headers',
          issues: error.issues
        });
      }
      throw error;
    }
  }

  // 全面验证
  static async validateRequest<T extends ValidationResult>(
    req: NextRequest,
    config: ValidationConfig,
    params?: any
  ): Promise<T> {
    const result: any = {};

    try {
      // 验证请求体
      if (config.body) {
        result.body = await this.validateBody(req, config.body);
      }

      // 验证查询参数
      if (config.query) {
        result.query = this.validateQuery(req, config.query);
      }

      // 验证路径参数
      if (config.params && params) {
        result.params = this.validateParams(params, config.params);
      }

      // 验证请求头
      if (config.headers) {
        result.headers = this.validateHeaders(req, config.headers);
      }

      return result as T;
    } catch (error) {
      // 重新抛出验证错误
      throw error;
    }
  }
}

// 常用的验证模式
export const CommonSchemas = {
  // 分页参数
  pagination: z.object({
    page: z.string().optional().transform(val => val ? parseInt(val, 10) : 1),
    pageSize: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
    limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 10),
    offset: z.string().optional().transform(val => val ? parseInt(val, 10) : 0)
  }).refine(data => {
    return data.page >= 1 && data.pageSize >= 1 && data.pageSize <= 100;
  }, {
    message: "Page must be >= 1, pageSize must be between 1 and 100"
  }),

  // ID参数
  id: z.object({
    id: z.string().min(1, "ID is required")
  }),

  // 数字ID参数
  numericId: z.object({
    id: z.string().transform(val => parseInt(val, 10)).refine(val => !isNaN(val) && val > 0, {
      message: "ID must be a positive number"
    })
  }),

  // 搜索参数
  search: z.object({
    q: z.string().optional(),
    query: z.string().optional(),
    search: z.string().optional(),
    keyword: z.string().optional()
  }),

  // 排序参数
  sort: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).optional().default('desc'),
    orderBy: z.string().optional(),
    order: z.enum(['asc', 'desc']).optional()
  }),

  // 日期范围参数
  dateRange: z.object({
    startDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
      message: "Invalid start date format"
    }),
    endDate: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), {
      message: "Invalid end date format"
    }),
    from: z.string().optional(),
    to: z.string().optional()
  }),

  // 认证头
  authHeaders: z.object({
    authorization: z.string().min(1, "Authorization header is required")
  }),

  // API密钥头
  apiKeyHeaders: z.object({
    'x-api-key': z.string().min(1, "API key is required")
  }),

  // 内容类型头
  jsonHeaders: z.object({
    'content-type': z.string().refine(val => val.includes('application/json'), {
      message: "Content-Type must be application/json"
    })
  })
};

// 验证装饰器工厂
export function withValidation<T extends ValidationResult>(
  config: ValidationConfig
) {
  return function <THandler extends (req: NextRequest, validated: T, ...args: any[]) => any>(
    handler: THandler
  ) {
    return async function validatedHandler(
      req: NextRequest,
      context?: any,
      ...args: any[]
    ) {
      // 执行验证
      const validated = await RequestValidator.validateRequest<T>(
        req,
        config,
        context?.params
      );

      // 调用原始处理器，传入验证后的数据
      return handler(req, validated, context, ...args);
    };
  };
}

// 快速验证助手
export const validate = {
  // 验证分页参数
  pagination: (req: NextRequest) => 
    RequestValidator.validateQuery(req, CommonSchemas.pagination),

  // 验证ID参数
  id: (params: any) => 
    RequestValidator.validateParams(params, CommonSchemas.id),

  // 验证数字ID参数
  numericId: (params: any) => 
    RequestValidator.validateParams(params, CommonSchemas.numericId),

  // 验证搜索参数
  search: (req: NextRequest) => 
    RequestValidator.validateQuery(req, CommonSchemas.search),

  // 验证排序参数
  sort: (req: NextRequest) => 
    RequestValidator.validateQuery(req, CommonSchemas.sort),

  // 验证日期范围参数
  dateRange: (req: NextRequest) => 
    RequestValidator.validateQuery(req, CommonSchemas.dateRange),

  // 验证认证头
  authHeaders: (req: NextRequest) => 
    RequestValidator.validateHeaders(req, CommonSchemas.authHeaders),

  // 验证JSON请求体
  json: <T>(req: NextRequest, schema: ZodSchema<T>) => 
    RequestValidator.validateBody(req, schema)
};

// 所有导出已在上面定义，无需重复导出