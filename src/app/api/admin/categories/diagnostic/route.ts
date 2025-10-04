import { NextRequest, NextResponse } from 'next/server';
import CategoryDatabaseDiagnostic from '@/lib/categoryDatabaseDiagnostic';

export async function GET(request: NextRequest) {
  try {
    // 运行完整诊断
    const diagnosticResult = await CategoryDatabaseDiagnostic.runFullDiagnostic();
    
    // 生成报告
    const report = CategoryDatabaseDiagnostic.generateReport(diagnosticResult);
    
    return NextResponse.json({
      success: true,
      data: {
        result: diagnosticResult,
        report,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('数据库诊断失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'DIAGNOSTIC_FAILED',
        message: error instanceof Error ? error.message : '诊断失败'
      }
    }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action } = body;
    
    if (action === 'fix-structure') {
      // 执行数据库结构修复
      return await fixDatabaseStructure();
    } else if (action === 'create-test-data') {
      // 创建测试数据
      return await createTestData();
    } else if (action === 'validate-api') {
      // 验证API数据格式
      return await validateApiData();
    } else if (action === 'validate-data') {
      // 验证数据一致性
      return await validateDataConsistency();
    } else if (action === 'fix-data') {
      // 修复数据问题
      return await fixDataIssues();
    } else {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_ACTION',
          message: '无效的操作类型'
        }
      }, { status: 400 });
    }
  } catch (error) {
    console.error('执行修复操作失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'FIX_FAILED',
        message: error instanceof Error ? error.message : '修复失败'
      }
    }, { status: 500 });
  }
}

async function fixDatabaseStructure() {
  try {
    const { CategoryDatabaseMigration } = await import('@/lib/categoryDatabaseMigration');
    const migrationResult = await CategoryDatabaseMigration.runMigration();
    
    return NextResponse.json({
      success: migrationResult.success,
      data: migrationResult,
      message: migrationResult.message
    });
  } catch (error) {
    console.error('数据库结构修复失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'MIGRATION_FAILED',
        message: error instanceof Error ? error.message : '数据库结构修复失败'
      }
    }, { status: 500 });
  }
}

async function createTestData() {
  try {
    const { CategoryTestDataGenerator } = await import('@/lib/categoryTestDataGenerator');
    const testDataResult = await CategoryTestDataGenerator.createTestData();
    
    return NextResponse.json({
      success: testDataResult.success,
      data: testDataResult,
      message: testDataResult.message
    });
  } catch (error) {
    console.error('创建测试数据失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'TEST_DATA_FAILED',
        message: error instanceof Error ? error.message : '创建测试数据失败'
      }
    }, { status: 500 });
  }
}

async function validateApiData() {
  try {
    const { CategoryApiValidator } = await import('@/lib/categoryApiValidator');
    
    // 验证基本API
    const apiValidation = await CategoryApiValidator.validateApiData();
    
    // 验证树形API
    const treeValidation = await CategoryApiValidator.validateTreeApi();
    
    return NextResponse.json({
      success: apiValidation.success && treeValidation.success,
      data: {
        apiValidation,
        treeValidation
      },
      message: `API验证完成: ${apiValidation.success && treeValidation.success ? '通过' : '发现问题'}`
    });
  } catch (error) {
    console.error('API验证失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'API_VALIDATION_FAILED',
        message: error instanceof Error ? error.message : 'API验证失败'
      }
    }, { status: 500 });
  }
}

async function validateDataConsistency() {
  try {
    const { CategoryDataValidator } = await import('@/lib/categoryDataValidator');
    const validationResult = await CategoryDataValidator.validateAllData();
    
    return NextResponse.json({
      success: validationResult.success,
      data: validationResult,
      message: `数据验证完成: 发现 ${validationResult.issuesFound} 个问题`
    });
  } catch (error) {
    console.error('数据验证失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'DATA_VALIDATION_FAILED',
        message: error instanceof Error ? error.message : '数据验证失败'
      }
    }, { status: 500 });
  }
}

async function fixDataIssues() {
  try {
    const { CategoryDataValidator } = await import('@/lib/categoryDataValidator');
    
    // 先验证数据获取问题列表
    const validationResult = await CategoryDataValidator.validateAllData();
    
    // 修复可修复的问题
    const fixResult = await CategoryDataValidator.autoFixIssues(validationResult.issues);
    
    return NextResponse.json({
      success: fixResult.success,
      data: fixResult,
      message: fixResult.message
    });
  } catch (error) {
    console.error('数据修复失败:', error);
    
    return NextResponse.json({
      success: false,
      error: {
        code: 'DATA_FIX_FAILED',
        message: error instanceof Error ? error.message : '数据修复失败'
      }
    }, { status: 500 });
  }
}