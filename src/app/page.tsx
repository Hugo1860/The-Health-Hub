'use client';

import AntdHomeLayout from '../components/AntdHomeLayout';
import AntdMainContent from '../components/AntdMainContent';

export default function Home() {
  return (
    <div style={{ 
      backgroundColor: '#FFFFFF',
      minHeight: '100vh'
    }}>
      <AntdHomeLayout>
        <AntdMainContent />
      </AntdHomeLayout>
    </div>
  );
}