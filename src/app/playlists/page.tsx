'use client';

import React from 'react';
import AntdHomeLayout from '../../components/AntdHomeLayout';
import AdvancedPlaylistManager from '../../components/AdvancedPlaylistManager';

export default function PlaylistsPage() {
  return (
    <AntdHomeLayout>
      <AdvancedPlaylistManager />
    </AntdHomeLayout>
  );
}