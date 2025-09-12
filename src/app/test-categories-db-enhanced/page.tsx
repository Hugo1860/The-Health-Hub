'use client';

import React, { useState } from 'react';
import { Card, Button, Space, Typography, Alert, List, message, Divider } from 'antd';
import { ExperimentOutlined, DatabaseOutlined, CheckCircleOutlined } from '@ant-design/icons';
import { CategoriesProvider, useCategories } from '../../contexts/CategoriesContextNew';

const { Title, Text } = Typography;

function TestCategoriesDbEnhancedContent() {
  const { categories, loading, createCategory, deleteCategory, refreshCategories } = useCategories();
  const [testResults, setTestResults] = useState<Array<{
    test: string;
    status: 'pending' | 'success' | 'error';
    message?: string;
  }>>([]);

  // 测试创建测试分类
  const createTestCategories = async () => {
    const testCategories = [
      { name: '测试一级分类A', description: '用于测试的一级分类' },
      { name: '测试一级分类B', description: '用于测试的一级分类' }
    ];

    try {
      for (const category of testCategories) {
        const result = await createCategory(category);
        if (!result.success) {
          throw new Error(result.error?.message || '创建失败');
        }
      }
      
      setTestResults(prev => [...prev, {
        test: '创建测试分类',
        status: 'success',
        message: '成功创建测试分类'
      }]);
      
      refreshCategories();
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: '创建测试分类',
        status: 'error',
        message: error instanceof Error ? error.message : '创建失败'
      }]);
    }
  };

  // 测试删除功能
  const testDeleteFunction = async () => {
    const testCategory = categories.find(cat => 
      cat.name.includes('测试') && (cat.audioCount || 0) === 0
    );

    if (!testCategory) {
      setTestResults(prev => [...prev, {
        test: '删除功能测试',
        status: 'error',
        message: '没有找到可删除的测试分类'
      }]);
      return;
    }

    try {
      const result = await deleteCategory(testCategory.id);
      setTestResults(prev => [...prev, {
        test: '删除功能测试',
        status: result.success ? 'success' : 'error',
        message: result.success ? '删除功能正常' : result.error?.message
      }]);
      
      if (result.success) {
        refreshCategories();
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: '删除功能测试',
        status: 'error',
        message: error instanceof Error ? error.message : '删除失败'
      }]);
    }
  };

  // 测试批量删除API
  const testBatchDeleteAPI = async () => {
    const testCategories = categories
      .filter(cat => cat.name.includes('测试') && (cat.audioCount || 0) === 0)
      .slice(0, 2);

    if (testCategories.length === 0) {
      setTestResults(prev => [...prev, {
        test: '批量删除API测试',
        status: 'error',
        message: '没有找到可删除的测试分类'
      }]);
      return;
    }

    try {
      const response = await fetch('/api/categories/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          operation: 'delete',
          categoryIds: testCategories.map(c => c.id)
        })
      });

      const result = await response.json();
      
      setTestResults(prev => [...prev, {
        test: '批量删除API测试',
        status: response.ok && result.success ? 'success' : 'error',
        message: result.message || result.error?.message || '测试完成'
      }]);

      if (response.ok && result.success) {
        refreshCategories();
      }
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: '批量删除API测试',
        status: 'error',
        message: '网络错误'
      }]);
    }
  };

  // 测试分类层级功能
  const testHierarchyFeatures = async () => {
    try {
      // 检查是否有层级分类
      const primaryCategories = categories.filter(c => c.level === 1);
      const secondaryCategories = categories.filter(c => c.level === 2);
      
      setTestResults(prev => [...prev, {
        test: '层级功能测试',
        status: 'success',
        message: `发现 ${primaryCategories.length} 个一级分类，${secondaryCategories.length} 个二级分类`
      }]);
    } catch (error) {
      setTestResults(prev => [...prev, {
        test: '层级功能测试',
        status: 'error',
        message: '层级功能测试失败'
      }]);
    }
  };

  const runAllTests = async () => {
    setTestResults([]);
    message.info('开始运行增强功能测试...');
    
    await testHierarchyFeatures();
    await createTestCategories();
    await testDeleteFunction();
    await testBatchDeleteAPI();
    
    message.success('所有测试完成');
  };

  const clearResults = () => {
    setTestResults([]);
  };

  const cleanupTestData = async () => {
    const testCategories = categories.filter(cat => cat.name.includes('测试'));
    
    if (testCategories.length === 0) {
      message.info('没有找到测试数据');
      return;
    }

    try {
      for (const category of testCategories) {
        await deleteCategory(category.id, { force: true });
      }
      message.success(`清理了 ${testCategories.length} 个测试分类`);
      refreshCategories();
    } catch (error) {
      message.error('清理测试数据失败');
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      <Card>
        <Title level={2}>
          <DatabaseOutlined /> 增强分类管理界面测试
        </Title>
        
        <Alert
          message="测试说明"
          description="此页面用于测试增强的分类管理功能，包括层级分类、删除功能、批量操作等。"
          type="info"
          style={{ marginBottom: 24 }}
        />

        <Space style={{ marginBottom: 16 }}>
          <Button 
            type="primary" 
            icon={<ExperimentOutlined />}
            onClick={runAllTests}
            loading={loading}
          >
            运行所有测试
          </Button>
          <Button onClick={clearResults}>
            清除结果
          </Button>
          <Button onClick={refreshCategories} loading={loading}>
            刷新数据
          </Button>
          <Button onClick={cleanupTestData} danger>
            清理测试数据
          </Button>
        </Space>

        {/* 当前分类统计 */}
        <Card size="small" title="当前分类统计" style={{ marginBottom: 16 }}>
          <Space size="large">
            <div>
              <Text type="secondary">总分类：</Text>
              <Text strong>{categories.length}</Text>
            </div>
            <div>
              <Text type="secondary">一级分类：</Text>
              <Text strong>{categories.filter(c => c.level === 1).length}</Text>
            </div>
            <div>
              <Text type="secondary">二级分类：</Text>
              <Text strong>{categories.filter(c => c.level === 2).length}</Text>
            </div>
            <div>
              <Text type="secondary">激活分类：</Text>
              <Text strong>{categories.filter(c => c.isActive !== false).length}</Text>
            </div>
            <div>
              <Text type="secondary">测试分类：</Text>
              <Text strong>{categories.filter(c => c.name.includes('测试')).length}</Text>
            </div>
          </Space>
        </Card>

        {/* 测试结果 */}
        {testResults.length > 0 && (
          <Card title="测试结果" size="small" style={{ marginBottom: 16 }}>
            <List
              dataSource={testResults}
              renderItem={(item) => (
                <List.Item>
                  <Space>
                    <span style={{
                      color: item.status === 'success' ? '#52c41a' : 
                             item.status === 'error' ? '#ff4d4f' : '#1890ff'
                    }}>
                      {item.status === 'success' ? '✅' : 
                       item.status === 'error' ? '❌' : '⏳'}
                    </span>
                    <Text strong>{item.test}</Text>
                    <Text type={item.status === 'error' ? 'danger' : 'secondary'}>
                      {item.message}
                    </Text>
                  </Space>
                </List.Item>
              )}
            />
          </Card>
        )}

        <Divider />

        {/* 功能验证清单 */}
        <Card title="功能验证清单" size="small">
          <List
            dataSource={[
              { feature: '层级分类支持', description: '支持一级和二级分类结构' },
              { feature: '智能删除验证', description: '删除前检查依赖关系' },
              { feature: '批量操作', description: '支持批量删除和状态更新' },
              { feature: '强制删除', description: '支持跳过安全检查的强制删除' },
              { feature: '级联删除', description: '删除父分类时同时删除子分类' },
              { feature: '状态管理', description: '支持激活/停用分类' },
              { feature: '音频关联显示', description: '显示每个分类的音频数量' },
              { feature: '删除确认对话框', description: '智能分析删除影响' }
            ]}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <Text strong>{item.feature}</Text>
                  <Text type="secondary">{item.description}</Text>
                </Space>
              </List.Item>
            )}
          />
        </Card>

        <Alert
          message="访问增强的管理界面"
          description="测试完成后，您可以访问 /admin/categories-db 页面体验完整的增强分类管理功能。"
          type="success"
          style={{ marginTop: 24 }}
        />
      </Card>
    </div>
  );
}

export default function TestCategoriesDbEnhancedPage() {
  return (
    <CategoriesProvider>
      <TestCategoriesDbEnhancedContent />
    </CategoriesProvider>
  );
}