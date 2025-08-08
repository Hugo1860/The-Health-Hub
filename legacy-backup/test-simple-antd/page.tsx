'use client';

import React from 'react';
import { Button } from 'antd';

export default function TestSimpleAntd() {
  return (
    <div style={{ padding: '20px' }}>
      <div style={{ border: '1px solid #ccc', padding: '20px', borderRadius: '8px' }}>
        <h2>Antd 测试页面</h2>
        <Button type="primary">Antd 按钮</Button>
      </div>
    </div>
  );
}