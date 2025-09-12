'use client';

import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter, usePathname } from 'next/navigation';
import {
  Layout,
  Menu,
  Avatar,
  Dropdown,
  Button,
  Space,
  Typography,
  Input,
  Card,
  Drawer,
  Grid
} from 'antd';
import {
  HomeOutlined,
  SearchOutlined,
  HeartOutlined,
  UnorderedListOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  SettingOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { useAudioStore } from '../store/audioStore';
import GlobalAudioPlayer from './GlobalAudioPlayer';
import Logo from './Logo';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Text } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;

interface SimplifiedHomeLayoutProps {
  children: React.ReactNode;
}

type MenuItem = Required<MenuProps>['items'][number];

export default function SimplifiedHomeLayout({ children }: SimplifiedHomeLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const { currentAudio } = useAudioStore();

  const isMobile = !screens.md;

  // 简化的主导航菜单
  const menuItems: MenuItem[] = [
    {
      key: '/',
      icon: <HomeOutlined />,
      label: '主页',
    },
    {
      key: '/browse',
      icon: <SearchOutlined />,
      label: '浏览',
    },
    {
      key: '/favorites',
      icon: <HeartOutlined />,
      label: '收藏',
      disabled: !session,
    },
    {
      key: '/playlists',
      icon: <UnorderedListOutlined />,
      label: '播放列表',
      disabled: !session,
    },
  ];

  // 简化的用户菜单
  const userMenuItems: MenuProps['items'] = session ? [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => router.push('/profile'),
    },
    ...(session.user?.role === 'admin' ? [{
      key: 'admin',
      icon: <SettingOutlined />,
      label: '管理后台',
      onClick: () => router.push('/admin'),
    }] : []),
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => router.push('/auth/signin'),
    },
  ] : [
    {
      key: 'login',
      icon: <LoginOutlined />,
      label: '登录',
      onClick: () => router.push('/auth/signin'),
    },
  ];

  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
    if (isMobile && mobileDrawerOpen) {
      setTimeout(() => setMobileDrawerOpen(false), 100);
    }
  };

  const handleSearch = (value: string) => {
    if (value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      if (isMobile && mobileDrawerOpen) {
        setTimeout(() => setMobileDrawerOpen(false), 100);
      }
    }
  };

  // 简化的侧边栏内容
  const SidebarContent = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      padding: 16
    }}>
      {/* Logo */}
      <div style={{ marginBottom: 24, textAlign: 'center' }}>
        <Logo 
          size={collapsed && !inDrawer ? "small" : "medium"}
          onClick={() => {
            router.push('/');
            if (inDrawer) setMobileDrawerOpen(false);
          }}
        />
      </div>

      {/* 搜索框 */}
      {(!collapsed || inDrawer) && (
        <div style={{ marginBottom: 24 }}>
          <Search
            placeholder="搜索音频..."
            onSearch={handleSearch}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* 导航菜单 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[pathname]}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ 
          borderRight: 0,
          backgroundColor: 'transparent'
        }}
      />
    </div>
  );

  return (
    <>
      {/* 全局播放器 */}
      <GlobalAudioPlayer 
        sidebarWidth={collapsed ? 80 : 280}
        isMobile={isMobile}
      />
      
      <Layout style={{ minHeight: '100vh' }}>
        {/* 桌面端侧边栏 */}
        {!isMobile && (
          <Sider
            collapsible
            collapsed={collapsed}
            onCollapse={setCollapsed}
            width={280}
            style={{
              overflow: 'auto',
              height: '100vh',
              position: 'fixed',
              left: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'var(--wechat-bg-secondary)',
            }}
          >
            <SidebarContent />
          </Sider>
        )}

        {/* 移动端抽屉 */}
        {isMobile && (
          <Drawer
            title={null}
            placement="left"
            onClose={() => setMobileDrawerOpen(false)}
            open={mobileDrawerOpen}
            styles={{ 
              body: { 
                padding: 0, 
                backgroundColor: 'var(--wechat-bg-secondary)',
              }
            }}
            width={260}
            closable={false}
            maskClosable={true}
          >
            <SidebarContent inDrawer />
          </Drawer>
        )}

        <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 280) }}>
          {/* 移动端顶部栏 */}
          {isMobile && (
            <Header style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: 64,
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(10px)',
              borderBottom: '1px solid rgba(0, 0, 0, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '0 16px',
              zIndex: 1001,
            }}>
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
                style={{ fontSize: '16px' }}
              />
              
              <Logo size="small" onClick={() => router.push('/')} />
              
              <div style={{ width: 40 }} />
            </Header>
          )}

          {/* 用户信息卡片 - 简化版 */}
          <div style={{
            position: 'fixed',
            bottom: 20,
            left: 20,
            zIndex: 1001
          }}>
            <Dropdown menu={{ items: userMenuItems }} placement="topLeft">
              <Card
                hoverable
                style={{ 
                  cursor: 'pointer',
                  backgroundColor: 'rgba(255,255,255,0.95)',
                  backdropFilter: 'blur(10px)',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  border: 'none',
                  borderRadius: 12
                }}
                styles={{ body: { padding: 12 } }}
              >
                <Space>
                  <Avatar
                    size={isMobile ? 'default' : 'large'}
                    style={{ backgroundColor: session ? '#13C2C2' : '#FAAD14' }}
                    icon={<UserOutlined />}
                  >
                    {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'G'}
                  </Avatar>
                  {!isMobile && (
                    <div>
                      <Text strong style={{ display: 'block', fontSize: 14 }}>
                        {session?.user?.name || session?.user?.email || '游客'}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {session ? '已登录' : '点击登录'}
                      </Text>
                    </div>
                  )}
                </Space>
              </Card>
            </Dropdown>
          </div>

          <Content style={{ 
            margin: 0, 
            background: '#F8F9FA',
            minHeight: '100vh',
            paddingTop: isMobile ? (currentAudio ? 152 : 64) : 0
          }}>
            <div style={{
              padding: isMobile ? 16 : 24,
              minHeight: isMobile ? (currentAudio ? 'calc(100vh - 152px)' : 'calc(100vh - 64px)') : '100vh',
            }}>
              {children}
            </div>
          </Content>
        </Layout>
      </Layout>
    </>
  );
}