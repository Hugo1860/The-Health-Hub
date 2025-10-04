'use client';

import SimplifiedHomeLayout from '../../components/SimplifiedHomeLayout';
import SimplifiedMainContent from '../../components/SimplifiedMainContent';

export default function SimplePage() {
  return (
    <div style={{ 
      backgroundColor: '#FFFFFF',
      minHeight: '100vh'
    }}>
      <SimplifiedHomeLayout>
        <SimplifiedMainContent />
      </SimplifiedHomeLayout>
    </div>
  );
}