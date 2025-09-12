import { apiMiddleware, createApiResponse } from '@/lib/api-middleware';
import { ApiErrors } from '@/lib/api-error-handler';
// import { databaseManager } from '@/lib/database-adapter'; // Deprecated
import { DatabaseConfigUtils, DatabaseConfigBuilder } from '@/lib/database-config';
import { NextResponse } from 'next/server';

// 获取数据库适配器信息
export const GET = apiMiddleware.public(async (req, context) => {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(req.url);
    const adapterName = searchParams.get('adapter');
    const includeHealth = searchParams.get('health') === 'true';
    const includeInfo = searchParams.get('info') === 'true';
    
    if (adapterName) {
      // 获取特定适配器信息
      try {
        const adapter = databaseManager.getAdapter(adapterName);
        
        const adapterInfo: any = {
          name: adapterName,
          type: adapter.type,
          connected: adapter.isConnected(),
          poolStatus: adapter.getPoolStatus()
        };
        
        if (includeHealth) {
          adapterInfo.health = await adapter.healthCheck();
        }
        
        if (includeInfo && adapter.isConnected()) {
          try {
            adapterInfo.databaseInfo = await adapter.getDatabaseInfo();
          } catch (error) {
            adapterInfo.databaseInfoError = error instanceof Error ? error.message : 'Unknown error';
          }
        }
        
        const responseTime = Date.now() - startTime;
        
        const responseData = {
          adapter: adapterInfo,
          meta: {
            responseTime,
            timestamp: new Date().toISOString()
          }
        };
        
        const response = createApiResponse(responseData, 'Adapter information retrieved successfully', context.requestId);
        
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
        
      } catch (error) {
        throw ApiErrors.NOT_FOUND(`Database adapter not found: ${adapterName}`);
      }
    } else {
      // 获取所有适配器信息
      const adapters = databaseManager.getAllAdapters();
      const adapterInfos: any[] = [];
      
      for (const [name, adapter] of adapters.entries()) {
        const adapterInfo: any = {
          name,
          type: adapter.type,
          connected: adapter.isConnected(),
          poolStatus: adapter.getPoolStatus()
        };
        
        if (includeHealth) {
          try {
            adapterInfo.health = await adapter.healthCheck();
          } catch (error) {
            adapterInfo.healthError = error instanceof Error ? error.message : 'Unknown error';
          }
        }
        
        adapterInfos.push(adapterInfo);
      }
      
      // 获取健康检查汇总
      let healthSummary = {};
      if (includeHealth) {
        try {
          healthSummary = await databaseManager.healthCheckAll();
        } catch (error) {
          console.error('Error getting health summary:', error);
        }
      }
      
      const responseTime = Date.now() - startTime;
      
      const responseData = {
        adapters: adapterInfos,
        summary: {
          total: adapterInfos.length,
          connected: adapterInfos.filter(a => a.connected).length,
          healthy: includeHealth ? Object.values(healthSummary).filter((h: any) => h.healthy).length : undefined
        },
        healthSummary: includeHealth ? healthSummary : undefined,
        meta: {
          responseTime,
          timestamp: new Date().toISOString()
        }
      };
      
      const response = createApiResponse(responseData, 'Database adapters retrieved successfully', context.requestId);
      
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
      'Failed to retrieve database adapter information',
      { 
        originalError: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    );
  }
});

// 注册新的数据库适配器
export const POST = apiMiddleware.public(async (req, context) => {
  const startTime = Date.now();
  
  try {
    const body = await req.json();
    const { 
      name, 
      config, 
      template,
      setAsDefault = false,
      testConnection = true 
    } = body;
    
    if (!name) {
      throw ApiErrors.VALIDATION_ERROR('Adapter name is required');
    }
    
    if (!config && !template) {
      throw ApiErrors.VALIDATION_ERROR('Either config or template is required');
    }
    
    let finalConfig;
    
    if (template) {
      // 使用模板创建配置
      const templateData = DatabaseConfigUtils.getTemplate(template);
      if (!templateData) {
        throw ApiErrors.VALIDATION_ERROR(`Unknown template: ${template}`);
      }
      
      const builder = new DatabaseConfigBuilder(template);
      
      // 应用覆盖配置
      if (config) {
        if (config.connection) builder.setConnection(config.connection);
        if (config.pool) builder.setPool(config.pool);
        if (config.performance) builder.setPerformance(config.performance);
        if (config.options) builder.setOptions(config.options);
      }
      
      finalConfig = builder.build();
    } else {
      // 验证提供的配置
      const validation = DatabaseConfigUtils.validate(config);
      if (!validation.valid) {
        throw ApiErrors.VALIDATION_ERROR(`Invalid configuration: ${validation.errors.join(', ')}`);
      }
      
      finalConfig = config;
    }
    
    // 测试连接（如果请求）
    if (testConnection) {
      try {
        // const { DatabaseAdapterFactory } = await import('@/lib/database-adapter'); // Deprecated
        const testAdapter = DatabaseAdapterFactory.create(finalConfig);
        await testAdapter.connect();
        await testAdapter.healthCheck();
        await testAdapter.disconnect();
      } catch (error) {
        throw ApiErrors.VALIDATION_ERROR(
          `Connection test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        );
      }
    }
    
    // 注册适配器
    await databaseManager.registerAdapter(name, finalConfig, setAsDefault);
    
    const responseTime = Date.now() - startTime;
    
    const responseData = {
      message: 'Database adapter registered successfully',
      adapter: {
        name,
        type: finalConfig.type,
        summary: DatabaseConfigUtils.summarize(finalConfig),
        safeUrl: DatabaseConfigUtils.toSafeUrl(finalConfig),
        setAsDefault
      },
      meta: {
        responseTime,
        timestamp: new Date().toISOString()
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
    }, { status: 201 });
    
  } catch (error) {
    if (error instanceof ApiErrors.ApiError) {
      throw error;
    }
    
    throw ApiErrors.INTERNAL_SERVER_ERROR(
      'Failed to register database adapter',
      { 
        originalError: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    );
  }
});

// 删除数据库适配器
export const DELETE = apiMiddleware.public(async (req, context) => {
  const startTime = Date.now();
  
  try {
    const { searchParams } = new URL(req.url);
    const adapterName = searchParams.get('adapter');
    
    if (!adapterName) {
      throw ApiErrors.VALIDATION_ERROR('Adapter name is required');
    }
    
    // 检查适配器是否存在
    try {
      databaseManager.getAdapter(adapterName);
    } catch (error) {
      throw ApiErrors.NOT_FOUND(`Database adapter not found: ${adapterName}`);
    }
    
    // 移除适配器
    await databaseManager.removeAdapter(adapterName);
    
    const responseTime = Date.now() - startTime;
    
    const responseData = {
      message: 'Database adapter removed successfully',
      adapterName,
      meta: {
        responseTime,
        timestamp: new Date().toISOString()
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
      'Failed to remove database adapter',
      { 
        originalError: error instanceof Error ? error.message : 'Unknown error',
        responseTime: Date.now() - startTime
      }
    );
  }
});