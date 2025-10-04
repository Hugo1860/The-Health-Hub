'use client'

import React, { useState } from 'react';
import { Card, Button, Typography, Space, Alert, Spin } from 'antd';
import { PlayCircleOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Title, Text, Paragraph } = Typography;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export default function TestShareCardPage() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<TestResult[]>([]);
  const [summary, setSummary] = useState<{ passed: number; total: number } | null>(null);

  const runTests = async () => {
    setIsRunning(true);
    setResults([]);
    setSummary(null);

    try {
      // 动态导入测试模块
      const { runShareCardTests } = await import('@/lib/__tests__/share-card-tests');
      
      // 重定向 console.log 来捕获测试输出
      const originalLog = console.log;
      const testResults: TestResult[] = [];
      
      console.log = (...args: any[]) => {
        const message = args.join(' ');
        
        if (message.startsWith('✅')) {
          const testName = message.substring(2).trim();
          testResults.push({
            name: testName,
            passed: true,
            duration: 0
          });
        } else if (message.startsWith('❌')) {
          const parts = message.substring(2).split(':');
          const testName = parts[0].trim();
          const error = parts.slice(1).join(':').trim();
          testResults.push({
            name: testName,
            passed: false,
            error,
            duration: 0
          });
        }
        
        // 仍然输出到控制台
        originalLog(...args);
      };

      // 运行测试
      await runShareCardTests();
      
      // 恢复 console.log
      console.log = originalLog;
      
      // 更新结果
      setResults(testResults);
      
      const passed = testResults.filter(r => r.passed).length;
      const total = testResults.length;
      setSummary({ passed, total });
      
    } catch (error) {
      console.error('Failed to run tests:', error);
      setResults([{
        name: 'Test Runner Error',
        passed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        duration: 0
      }]);
    } finally {
      setIsRunning(false);
    }
  };

  const getStatusIcon = (passed: boolean) => {
    return passed ? (
      <CheckCircleOutlined style={{ color: '#52c41a' }} />
    ) : (
      <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    );
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      <Card>
        <Title level={2}>
          🧪 ShareCard 功能测试
        </Title>
        
        <Paragraph>
          这个页面用于测试音频分享卡片功能的各个组件和服务。
          点击下面的按钮运行所有测试。
        </Paragraph>

        <Space direction="vertical" style={{ width: '100%' }}>
          <Button
            type="primary"
            size="large"
            icon={<PlayCircleOutlined />}
            onClick={runTests}
            loading={isRunning}
            disabled={isRunning}
          >
            {isRunning ? '运行测试中...' : '运行所有测试'}
          </Button>

          {isRunning && (
            <Card size="small">
              <Space>
                <Spin size="small" />
                <Text>正在运行测试，请查看浏览器控制台获取详细输出...</Text>
              </Space>
            </Card>
          )}

          {summary && (
            <Alert
              message={`测试完成: ${summary.passed}/${summary.total} 通过`}
              type={summary.passed === summary.total ? 'success' : 'warning'}
              showIcon
            />
          )}

          {results.length > 0 && (
            <Card title="测试结果" size="small">
              <div style={{ maxHeight: '400px', overflow: 'auto' }}>
                {results.map((result, index) => (
                  <div
                    key={index}
                    style={{
                      padding: '8px 0',
                      borderBottom: index < results.length - 1 ? '1px solid #f0f0f0' : 'none',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}
                  >
                    {getStatusIcon(result.passed)}
                    <div style={{ flex: 1 }}>
                      <Text strong={!result.passed} type={result.passed ? 'success' : 'danger'}>
                        {result.name}
                      </Text>
                      {result.error && (
                        <div style={{ marginTop: '4px' }}>
                          <Text type="danger" style={{ fontSize: '12px' }}>
                            {result.error}
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          <Card title="测试说明" size="small">
            <Paragraph>
              <Text strong>测试覆盖范围：</Text>
            </Paragraph>
            <ul>
              <li><Text code>QRCodeGenerator</Text> - 二维码生成和URL验证</li>
              <li><Text code>ShareCardErrorHandler</Text> - 错误处理和数据验证</li>
              <li><Text code>CardTemplateManager</Text> - 模板管理和验证</li>
              <li><Text code>CanvasPool</Text> - Canvas对象池管理</li>
              <li><Text code>ImageCache</Text> - 图片缓存功能</li>
              <li><Text code>MemoryManager</Text> - 内存管理和监控</li>
            </ul>
            
            <Paragraph style={{ marginTop: '16px' }}>
              <Text type="secondary">
                注意：某些测试可能在不同的浏览器环境中有不同的结果。
                如果测试失败，请检查浏览器控制台获取更详细的错误信息。
              </Text>
            </Paragraph>
          </Card>
        </Space>
      </Card>
    </div>
  );
}