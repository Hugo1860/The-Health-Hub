'use client';

import { useState } from 'react';
import { Sidebar } from './Sidebar';
import MiniPlayer from './MiniPlayer';

interface HomeLayoutProps {
  children: React.ReactNode;
}

export function HomeLayout({ children }: HomeLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div 
      className="home-layout"
      style={{
        display: 'grid',
        gridTemplateColumns: '300px 1fr',
        gridTemplateRows: '1fr',
        height: '100vh',
        gap: 0,
        background: '#f8f9fa'
      }}
    >
      {/* 移动端菜单按钮 */}
      <button
        className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white rounded-md shadow-md"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {/* 左侧边栏 */}
      <div 
        className={`sidebar ${sidebarOpen ? 'open' : ''}`}
        style={{
          background: '#f8f9fa',
          borderRight: '1px solid #e9ecef',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Sidebar onClose={() => setSidebarOpen(false)} />
      </div>

      {/* 右栏主内容 */}
      <div 
        className="main-content"
        style={{
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          background: 'white'
        }}
      >
        {children}
      </div>

      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-10"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
}