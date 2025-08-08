'use client';

import { Button, Card, Layout, Typography } from 'antd';
import AntdHomeLayout from '../../components/AntdHomeLayout';

const { Title, Text } = Typography;

export default function TestTheme() {
  return (
    <div style={{ 
      backgroundColor: '#FFFFFF',
      minHeight: '100vh',
      padding: '20px'
    }}>
      <Title level={2} style={{ color: '#343A40' }}>
        主题测试页面
      </Title>
      
      <Card 
        title="测试卡片"
        style={{ 
          marginBottom: '20px',
          backgroundColor: '#FFFFFF',
          border: '1px solid #E9ECEF'
        }}
      >
        <Text style={{ color: '#343A40' }}>
          这是一个测试卡片，用来验证主题颜色是否正确应用。
        </Text>
        <br /><br />
        <Button 
          type="primary" 
          style={{ 
            backgroundColor: '#00529B',
            borderColor: '#00529B'
          }}
        >
          主要按钮
        </Button>
        <Button 
          style={{ 
            marginLeft: '10px',
            backgroundColor: '#FFFFFF',
            borderColor: '#DEE2E6',
            color: '#495057'
          }}
        >
          默认按钮
        </Button>
      </Card>

      <AntdHomeLayout>
        <Card title="在布局中的卡片">
          <Text>这个卡片在AntdHomeLayout中，应该使用医疗主题配色。</Text>
        </Card>
      </AntdHomeLayout>
    </div>
  );
}