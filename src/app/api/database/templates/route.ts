import { apiMiddleware, createApiResponse } from '@/lib/api-middleware';
import { ApiErrors } from '@/lib/api-error-handler';
import { DatabaseConfigUtils, DatabaseConfigBuilder } from '@/lib/database-config';
import { NextResponse } from 'next/server';

// 获取数据库配置模板
export const GET = apiMiddleware.public(async (req, context) => {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(req.url);
    const templateName = searchParams.get('template');
    const type = searchParams.get('type');
    
    if (templateName) {
      // 获取特定模板
      const template = DatabaseConfigUtils.getTemplate(templateName);
      if (!template) {
        throw ApiErrors.NOT_FOUND(`Template not found: ${templateName}`);
      }
      
      const responseData = {
        template: {
          name: template.name,
          type: template.type,
          description: template.description,
          defaultConfig: template.defaultConfig,
          requiredFields: template.requiredFields,
          optionalFields: template.optionalFields
        },
        meta: {
          responseTime: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
      
      const response = createApiResponse(responseData, 'Template retrieved successfully', context.requestId);
      
      return NextResponse.json({
        success: true,
        data: response,
        meta: {
          requestId: context.requestId,
          timestamp: new Date().toISOString(),
          version: process.env.API_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      }, { status: 200 });
      
    } else {
      // 获取所有模板
      let templates = DatabaseConfigUtils.getAvailableTemplates();
      
      // 按类型过滤
      if (type) {
        templates = templates.filter(template => template.type === type);
      }
      
      const responseTime = Date.now() - startTime;
      
      const responseData = {
        templates: templates.map(template => ({
          name: template.name,
          type: template.type,
          description: template.description,
          requiredFields: template.requiredFields,
          optionalFields: template.optionalFields
        })),
        summary: {
          total: templates.length,
          byType: templates.reduce((acc, template) => {
            acc[template.type] = (acc[template.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        },
        filters: {
          type
        },
        meta: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      };
      
      const response = createApiResponse(responseData, 'Templates retrieved successfully', context.requestId);
      
      return NextResponse.json({
        success: true,
        data: response,
        meta: {
          requestId: context.requestId,
          timestamp: new Date().toISOString(),
          version: process.env.API_VERSION || '1.0.0',
          environment: process.env.NODE_ENV || 'development'
        }
      }, { status: 200 });
    }
    
  } catch (error) {
    if (error instanceof ApiErrors.ApiError) {
      throw error;
    }
    
    throw ApiErrors.INTERNAL_SERVER_ERROR(
      'Failed to retrieve database templates',
      { 
        originalError: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    );
  }
});

// 生成数据库配置
export const POST = apiMiddleware.public(async (req, context) => {
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const { 
      template, 
      overrides = {},
      fromUrl,
      fromEnvironment,
      envPrefix = 'DB_',
      validate = true 
    } = body;
    
    let builder: DatabaseConfigBuilder;
    let config: any;
    
    if (fromUrl) {
      // 从URL生成配置
      try {
        config = DatabaseConfigUtils.fromUrl(fromUrl);
      } catch (error) {
        throw ApiErrors.VALIDATION_ERROR(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (fromEnvironment) {
      // 从环境变量生成配置
      try {
        config = DatabaseConfigUtils.fromEnvironment(envPrefix);
      } catch (error) {
        throw ApiErrors.VALIDATION_ERROR(`Failed to read from environment: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else if (template) {
      // 从模板生成配置
      const templateData = DatabaseConfigUtils.getTemplate(template);
      if (!templateData) {
        throw ApiErrors.VALIDATION_ERROR(`Unknown template: ${template}`);
      }
      
      try {
        config = DatabaseConfigUtils.fromTemplate(template, overrides);
      } catch (error) {
        throw ApiErrors.VALIDATION_ERROR(`Failed to generate from template: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    } else {
      // 使用覆盖配置创建
      builder = new DatabaseConfigBuilder();
      
      if (overrides.type) builder.setType(overrides.type);
      if (overrides.connection) builder.setConnection(overrides.connection);
      if (overrides.pool) builder.setPool(overrides.pool);
      if (overrides.performance) builder.setPerformance(overrides.performance);
      if (overrides.options) builder.setOptions(overrides.options);
      
      if (validate) {
        config = builder.build();
      } else {
        config = builder.getConfig();
      }
    }
    
    // 验证配置（如果请求）
    let validation = { valid: true, errors: [] };
    if (validate) {
      validation = DatabaseConfigUtils.validate(config);
    }
    
    const responseTime = Date.now() - startTime;
    
    const responseData = {
      message: 'Database configuration generated successfully',
      config,
      validation,
      summary: config.type ? DatabaseConfigUtils.summarize(config) : 'Incomplete configuration',
      safeUrl: config.type && validation.valid ? DatabaseConfigUtils.toSafeUrl(config) : undefined,
      meta: {
        responseTime,
        timestamp: new Date().toISOString(),
        source: fromUrl ? 'url' : fromEnvironment ? 'environment' : template ? 'template' : 'manual'
      }
    };
    
    const response = createApiResponse(responseData, undefined, context.requestId);
    
    return NextResponse.json({
      success: true,
      data: responseData,
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development'
      }
    }, { status: 200 });
    
  } catch (error) {
    if (error instanceof ApiErrors.ApiError) {
      throw error;
    }
    
    throw ApiErrors.INTERNAL_SERVER_ERROR(
      'Failed to generate database configuration',
      { 
        originalError: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    );
  }
});