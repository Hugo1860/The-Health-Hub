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
  Spin,
  Result,
  Badge,
  Breadcrumb
} from 'antd';
import {
  DashboardOutlined,
  CloudUploadOutlined,
  SoundOutlined,
  CloudServerOutlined,
  TagsOutlined,
  FolderOutlined,
  FileImageOutlined,
  UserOutlined,
  BarChartOutlined,
  SecurityScanOutlined,
  ExclamationCircleOutlined,
  SettingOutlined,
  BugOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  BellOutlined,
  LogoutOutlined,
  HomeOutlined
} from '@ant-design/icons';
import { Grid } from 'antd';
import { useAntdAdminAuth, ANTD_ADMIN_PERMISSIONS } from '../hooks/useAntdAdminAuth';
import Logo from './Logo';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { useBreakpoint } = Grid;

interface AntdAdminLayoutProps {
  children: React.ReactNode;
}

type MenuItem = Required<MenuProps>['items'][number];

export default function AntdAdminLayout({ children }: AntdAdminLayoutProps) {
  const { data: session } = useSession();
  const { isAdmin, isLoading, hasPermission, userRole } = useAntdAdminAuth();
  const pathname = usePathname();
  const router = useRouter();
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  
  // 判断是否为移动端
  const isMobile = !screens.md;

  // 菜单项配置
  const menuItems: MenuItem[] = [
    {
      key: '/admin',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/admin/audio',
      icon: <SoundOutlined />,
      label: '音频管理',
      disabled: !hasPermission(ANTD_ADMIN_PERMISSIONS.UPLOAD_AUDIO),
    },
    {
      key: '/admin/categories',
      icon: <TagsOutlined />,
      label: '分类管理',
      disabled: !hasPermission(ANTD_ADMIN_PERMISSIONS.MANAGE_CATEGORIES),
    },
    {
      key: '/admin/resources',
      icon: <FolderOutlined />,
      label: '资源管理',
      disabled: !hasPermission(ANTD_ADMIN_PERMISSIONS.MANAGE_RESOURCES),
    },
    {
      key: '/admin/slides',
      icon: <FileImageOutlined />,
      label: '幻灯片管理',
      disabled: !hasPermission(ANTD_ADMIN_PERMISSIONS.MANAGE_SLIDES),
    },
    {
      key: '/admin/users',
      icon: <UserOutlined />,
      label: '用户管理',
      disabled: !hasPermission(ANTD_ADMIN_PERMISSIONS.VIEW_USERS),
    },
    {
      key: '/admin/analytics',
      icon: <BarChartOutlined />,
      label: '数据分析',
      disabled: !hasPermission(ANTD_ADMIN_PERMISSIONS.VIEW_ANALYTICS),
    },
    {
      key: 'logs',
      icon: <SecurityScanOutlined />,
      label: '日志管理',
      disabled: !hasPermission(ANTD_ADMIN_PERMISSIONS.VIEW_LOGS),
      children: [
        {
          key: '/admin/logs',
          label: '安全日志',
        },
        {
          key: '/admin/errors',
          label: '错误日志',
        },
      ],
    },
    {
      key: '/admin/system',
      icon: <CloudServerOutlined />,
      label: '系统设置',
      disabled: !hasPermission(ANTD_ADMIN_PERMISSIONS.SYSTEM_SETTINGS),
    },

  ].filter(item => !item?.disabled);

  // 用户下拉菜单
  const userMenuItems: MenuProps['items'] = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => router.push('/profile'),
    },
    {
      type: 'divider',
    },
    {
      key: 'home',
      icon: <HomeOutlined />,
      label: '返回前台',
      onClick: () => router.push('/'),
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: () => {
        // 这里可以添加退出登录逻辑
        router.push('/auth/signin');
      },
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    console.log('Menu clicked:', key);
    router.push(key);
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    return [pathname];
  };

  // 获取展开的菜单项
  const getOpenKeys = () => {
    if (pathname.includes('/admin/logs') || pathname.includes('/admin/errors')) {
      return ['logs'];
    }
    return [];
  };

  // 生成面包屑
  const getBreadcrumbItems = () => {
    const pathSegments = pathname.split('/').filter(Boolean);
    const breadcrumbItems: Array<{ title: React.ReactNode }> = [
      {
        title: <HomeOutlined />,
      },
    ];

    let currentPath = '';
    pathSegments.forEach((segment, index) => {
      currentPath += `/${segment}`;

      if (segment === 'admin' && index === 0) {
        breadcrumbItems.push({
          title: '管理后台',
        });
      } else {
        // 根据路径找到对应的菜单项名称
        const menuItem = findMenuItemByPath(currentPath);
        breadcrumbItems.push({
          title: menuItem?.label || segment,
        });
      }
    });

    return breadcrumbItems;
  };

  // 根据路径查找菜单项
  const findMenuItemByPath = (path: string): any => {
    const findInItems = (items: MenuItem[]): any => {
      for (const item of items) {
        if (item && typeof item === 'object' && 'key' in item) {
          if (item.key === path) {
            return item;
          }
          if ('children' in item && item.children) {
            const found = findInItems(item.children as MenuItem[]);
            if (found) return found;
          }
        }
      }
      return null;
    };
    return findInItems(menuItems);
  };

  // 获取当前页面标题
  const getPageTitle = () => {
    const menuItem = findMenuItemByPath(pathname);
    return menuItem?.label || '管理后台';
  };

  if (isLoading) {
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Spin size="large" tip="正在验证权限..." />
      </div>
    );
  }

  if (!isAdmin) {
    const user = session?.user as any;
    return (
      <div style={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <Result
          status="403"
          title="访问被拒绝"
          subTitle="您没有权限访问管理后台"
          extra={
            <Space direction="vertical">
              <Text type="secondary">
                当前用户角色: {userRole || '未知'}
              </Text>
              <Text type="secondary">
                当前用户状态: {user?.status || '未知'}
              </Text>
              <Text type="secondary">
                需要管理员权限 (admin/moderator/editor)
              </Text>
              <Button type="primary" onClick={() => router.push('/')}>
                返回首页
              </Button>
            </Space>
          }
        />
      </div>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* 移动端顶部Logo和菜单 */}
      {isMobile && (
        <div style={{
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
          zIndex: 1001, // 提高z-index，让Logo栏在播放器上方
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}>
          {/* 移动端菜单按钮 */}
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ 
              fontSize: '16px',
              width: 40,
              height: 40,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'transparent',
              color: '#333',
              borderRadius: '8px',
              transition: 'all 0.3s ease',
            }}
          />
          
          {/* 移动端Logo */}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <Logo 
              size="small"
              onClick={() => router.push('/admin')}
            />
          </div>
          
          {/* 用户信息 */}
          <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
            <Avatar
              size="small"
              style={{ backgroundColor: '#1890ff', cursor: 'pointer' }}
              icon={<UserOutlined />}
            >
              {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
            </Avatar>
          </Dropdown>
        </div>
      )}

      <Sider
        trigger={null}
        collapsible
        collapsed={isMobile ? true : collapsed}
        style={{
          overflow: 'auto',
          height: '100vh',
          position: 'fixed',
          left: isMobile ? (collapsed ? -200 : 0) : 0,
          top: isMobile ? 64 : 0,
          bottom: 0,
          backgroundColor: 'var(--wechat-bg-secondary)',
          zIndex: isMobile ? 1001 : 'auto',
          transition: 'left 0.3s ease',
        }}
        width={isMobile ? 200 : undefined}
      >
        <div style={{ margin: 16, display: 'flex', justifyContent: 'center' }}>
          <Logo 
            size={collapsed ? "small" : "medium"}
            onClick={() => router.push('/admin')}
          />
        </div>

        <Menu
          theme="dark"
          mode="inline"
          selectedKeys={getSelectedKeys()}
          openKeys={getOpenKeys()}
          items={menuItems}
          onClick={handleMenuClick}
        />
      </Sider>

      {/* 移动端遮罩层 */}
      {isMobile && !collapsed && (
        <div
          style={{
            position: 'fixed',
            top: 64,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.45)',
            zIndex: 1000,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setCollapsed(true)}
        />
      )}

      <Layout style={{ 
        marginLeft: isMobile ? 0 : (collapsed ? 80 : 200),
        paddingTop: isMobile ? 64 : 0
      }}>
        {/* 桌面端Header */}
        {!isMobile && (
          <Header style={{
            padding: '0 24px',
            background: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            boxShadow: '0 1px 4px rgba(0,21,41,.08)'
          }}>
            <Space>
              <Button
                type="text"
                icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
                onClick={() => setCollapsed(!collapsed)}
                style={{
                  fontSize: '16px',
                  width: 64,
                  height: 64,
                }}
              />
              <Title level={4} style={{ margin: 0, color: 'var(--wechat-primary)' }}>
                {getPageTitle()}
              </Title>
            </Space>

            <Space>
              <Badge count={5}>
                <Button
                  type="text"
                  icon={<BellOutlined />}
                  size="large"
                />
              </Badge>

              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space style={{ cursor: 'pointer' }}>
                  <Avatar
                    style={{ backgroundColor: '#1890ff' }}
                    icon={<UserOutlined />}
                  >
                    {session?.user?.name?.charAt(0) || session?.user?.email?.charAt(0) || 'U'}
                  </Avatar>
                  <Text>{session?.user?.name || session?.user?.email}</Text>
                </Space>
              </Dropdown>
            </Space>
          </Header>
        )}

        <Content style={{ margin: isMobile ? '8px' : '16px' }}>
          {!isMobile && (
            <Breadcrumb
              items={getBreadcrumbItems()}
              style={{ marginBottom: 16 }}
            />
          )}

          <div style={{
            padding: isMobile ? 16 : 24,
            minHeight: 360,
            background: '#fff',
            borderRadius: 6,
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
  );
}