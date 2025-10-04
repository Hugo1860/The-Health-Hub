'use client';

import React from 'react';
import AntdHomeLayout from '../../components/AntdHomeLayout';
import LearningProgressDashboard from '../../components/LearningProgressDashboard';

export default function LearningPage() {
  return (
    <AntdHomeLayout>
      <LearningProgressDashboard />
    </AntdHomeLayout>
  );
}
