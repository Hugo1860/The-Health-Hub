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
  Badge,
  Card,
  List,
  Tag,
  Divider,
  Drawer,
  Grid
} from 'antd';
import {
  HomeOutlined,
  SearchOutlined,
  HeartOutlined,
  UnorderedListOutlined,
  SoundOutlined,
  UserOutlined,
  LoginOutlined,
  LogoutOutlined,
  SettingOutlined,
  PlayCircleOutlined,
  TrophyOutlined,
  ClockCircleOutlined,
  MenuOutlined
} from '@ant-design/icons';
import { useAudioStore, AudioFile } from '../store/audioStore';
import GlobalAudioPlayer from './GlobalAudioPlayer';
import Logo from './Logo';
import type { MenuProps } from 'antd';

const { Header, Sider, Content } = Layout;
const { Title, Text } = Typography;
const { Search } = Input;
const { useBreakpoint } = Grid;

interface AntdHomeLayoutProps {
  children: React.ReactNode;
}

type MenuItem = Required<MenuProps>['items'][number];

interface Category {
  id: string;
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export default function AntdHomeLayout({ children }: AntdHomeLayoutProps) {
  const { data: session } = useSession();
  const pathname = usePathname();
  const router = useRouter();
  const screens = useBreakpoint();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [topCharts, setTopCharts] = useState<AudioFile[]>([]);
  const [recentlyPlayed, setRecentlyPlayed] = useState<AudioFile[]>([]);
  const { currentAudio } = useAudioStore();

  // 判断是否为移动端
  const isMobile = !screens.md;

  // 延迟获取非关键数据
  useEffect(() => {
    // 立即获取分类（关键数据）
    fetchCategories();
    
    // 延迟获取排行榜和最近播放（非关键数据）
    const timer = setTimeout(() => {
      fetchTopCharts();
      fetchRecentlyPlayed();
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  // 键盘事件处理
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && mobileDrawerOpen) {
        setMobileDrawerOpen(false);
      }
    };

    if (isMobile) {
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isMobile, mobileDrawerOpen]);

  const fetchCategories = async () => {
    try {
      // 使用简化的分类API，提高加载速度
      const response = await fetch('/api/simple-categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data);
        return;
      }
    } catch (error) {
      console.error('获取分类失败:', error);
    }
    
    // 使用默认分类
    const defaultCategories: Category[] = [
      { id: 'cardiology', name: '心血管', color: '#ef4444', icon: '❤️' },
      { id: 'neurology', name: '神经科', color: '#8b5cf6', icon: '🧠' },
      { id: 'internal-medicine', name: '内科学', color: '#10b981', icon: '🏥' },
      { id: 'surgery', name: '外科', color: '#f59e0b', icon: '🔬' },
      { id: 'pediatrics', name: '儿科', color: '#3b82f6', icon: '👶' },
    ];
    setCategories(defaultCategories);
  };

  const fetchTopCharts = async () => {
    try {
      const response = await fetch('/api/audio/charts?range=week&limit=5');
      if (response.ok) {
        const data = await response.json();
        setTopCharts(data);
      }
    } catch (error) {
      console.error('获取排行榜失败:', error);
    }
  };

  const fetchRecentlyPlayed = async () => {
    const recent = localStorage.getItem('recentlyPlayed');
    if (recent) {
      setRecentlyPlayed(JSON.parse(recent).slice(0, 3));
    }
  };

  // 主导航菜单
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

  // 用户下拉菜单 - 删除设置按钮，只保留个人资料和退出登录
  const userMenuItems: MenuProps['items'] = session ? [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: '个人资料',
      onClick: () => router.push('/profile'),
    },
    // 只有管理员才显示管理后台
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
      onClick: () => {
        router.push('/auth/signin');
      },
    },
  ] : [
    {
      key: 'login',
      icon: <LoginOutlined />,
      label: '登录',
      onClick: () => router.push('/auth/signin'),
    },
  ];

  // 处理菜单点击
  const handleMenuClick = ({ key }: { key: string }) => {
    router.push(key);
    // 移动端点击菜单后关闭抽屉，添加延迟确保导航完成
    if (isMobile && mobileDrawerOpen) {
      setTimeout(() => {
        setMobileDrawerOpen(false);
      }, 100);
    }
  };

  // 获取当前选中的菜单项
  const getSelectedKeys = () => {
    return [pathname];
  };

  // 处理搜索
  const handleSearch = (value: string) => {
    if (value.trim()) {
      router.push(`/search?q=${encodeURIComponent(value.trim())}`);
      // 移动端搜索后关闭抽屉，添加延迟确保导航完成
      if (isMobile && mobileDrawerOpen) {
        setTimeout(() => {
          setMobileDrawerOpen(false);
        }, 100);
      }
    }
  };

  // 侧边栏内容组件
  const SidebarContent = ({ inDrawer = false }: { inDrawer?: boolean }) => (
    <div style={{ 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column',
      position: 'relative'
    }}>
      {/* 移动端抽屉顶部关闭区域 */}
      {inDrawer && (
        <div style={{
          height: 20,
          background: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, transparent 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative'
        }} onClick={() => setMobileDrawerOpen(false)}>
          <div style={{
            width: 40,
            height: 4,
            backgroundColor: 'rgba(255,255,255,0.3)',
            borderRadius: 2,
            marginTop: 8
          }} />
        </div>
      )}
      
      {/* Logo 区域 */}
      <div style={{ margin: inDrawer ? '8px 16px 16px' : 16, display: 'flex', justifyContent: 'center' }}>
        <Logo 
          size={(collapsed && !inDrawer) ? "small" : "medium"}
          onClick={() => {
            router.push('/');
            if (inDrawer) setMobileDrawerOpen(false);
          }}
        />
      </div>

      {/* 搜索框 */}
      {(!collapsed || inDrawer) && (
        <div style={{ padding: '0 16px 16px' }}>
          <Search
            placeholder="搜索音频..."
            onSearch={handleSearch}
            style={{ width: '100%' }}
          />
        </div>
      )}

      {/* 主导航菜单 */}
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={getSelectedKeys()}
        items={menuItems}
        onClick={handleMenuClick}
        style={{ 
          borderRight: 0, 
          flex: 'none',
          fontSize: inDrawer ? '16px' : '14px'
        }}
      />

      {/* 可滚动内容区域 */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {/* 分类列表 */}
        {(!collapsed || inDrawer) && categories.length > 0 && (
          <div style={{ padding: 16 }}>
            <Title level={5} style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>
              分类
            </Title>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {categories.map(category => (
                <Button
                  key={category.id}
                  type="text"
                  size={inDrawer ? "middle" : "small"}
                  style={{ 
                    color: 'rgba(255,255,255,0.65)', 
                    display: 'block',
                    textAlign: 'left',
                    marginBottom: 4,
                    width: '100%',
                    height: inDrawer ? '40px' : '32px',
                    touchAction: 'manipulation',
                    transition: 'all 0.2s ease'
                  }}
                  onClick={() => {
                    router.push(`/browse?category=${category.name}`);
                    if (inDrawer) {
                      setTimeout(() => {
                        setMobileDrawerOpen(false);
                      }, 100);
                    }
                  }}
                >
                  <span style={{ marginRight: 8 }}>{category.icon}</span>
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* 排行榜 */}
        {(!collapsed || inDrawer) && topCharts.length > 0 && (
          <div style={{ padding: 16 }}>
            <Title level={5} style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>
              <TrophyOutlined style={{ marginRight: 8 }} />
              本周热门
            </Title>
            <List
              size="small"
              dataSource={topCharts.slice(0, 3)}
              renderItem={(audio, index) => (
                <List.Item
                  style={{ 
                    padding: inDrawer ? '12px 0' : '8px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    touchAction: 'manipulation',
                    transition: 'background-color 0.2s ease',
                    borderRadius: '4px',
                    margin: '2px 0'
                  }}
                  onClick={() => {
                    router.push(`/audio/${audio.id}`);
                    if (inDrawer) {
                      setTimeout(() => {
                        setMobileDrawerOpen(false);
                      }, 100);
                    }
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Badge count={index + 1} size="small">
                        <Avatar 
                          size="small"
                          style={{ backgroundColor: '#13C2C2' }}
                          icon={<SoundOutlined />}
                        />
                      </Badge>
                    }
                    title={
                      <Text 
                        style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}
                        ellipsis
                      >
                        {audio.title}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}

        {/* 最近播放 */}
        {(!collapsed || inDrawer) && session && recentlyPlayed.length > 0 && (
          <div style={{ padding: 16 }}>
            <Title level={5} style={{ color: 'rgba(255,255,255,0.85)', marginBottom: 12 }}>
              <ClockCircleOutlined style={{ marginRight: 8 }} />
              最近播放
            </Title>
            <List
              size="small"
              dataSource={recentlyPlayed}
              renderItem={(audio) => (
                <List.Item
                  style={{ 
                    padding: inDrawer ? '12px 0' : '8px 0',
                    cursor: 'pointer',
                    borderBottom: '1px solid rgba(255,255,255,0.1)',
                    touchAction: 'manipulation',
                    transition: 'background-color 0.2s ease',
                    borderRadius: '4px',
                    margin: '2px 0'
                  }}
                  onClick={() => {
                    router.push(`/audio/${audio.id}`);
                    if (inDrawer) {
                      setTimeout(() => {
                        setMobileDrawerOpen(false);
                      }, 100);
                    }
                  }}
                >
                  <List.Item.Meta
                    avatar={
                      <Avatar 
                        size="small"
                        style={{ backgroundColor: '#13C2C2' }}
                        icon={<PlayCircleOutlined />}
                      />
                    }
                    title={
                      <Text 
                        style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12 }}
                        ellipsis
                      >
                        {audio.title}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}
      </div>
      
      {/* 侧边栏底部留出空间给用户信息卡片 */}
      <div style={{ height: 80 }} />
    </div>
  );

  return (
    <>
      {/* 全局播放器 */}
      <GlobalAudioPlayer 
        sidebarWidth={collapsed ? 80 : 320}
        isMobile={isMobile}
      />
      
      <Layout 
        className="medical-theme-override"
        style={{ 
          minHeight: '100vh',
          background: '#FFFFFF !important'
        }}>
      {/* 桌面端侧边栏 */}
      {!isMobile && (
        <Sider
          collapsible
          collapsed={collapsed}
          onCollapse={setCollapsed}
          width={320}
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
              overflow: 'hidden'
            },
            mask: {
              backgroundColor: 'rgba(0, 0, 0, 0.45)',
              backdropFilter: 'blur(4px)'
            }
          }}
          width={280}
          closable={false}
          maskClosable={true}
          keyboard={true}
          destroyOnHidden={false}
          forceRender={false}
          getContainer={false}
          push={false}
          autoFocus={true}
          rootStyle={{
            zIndex: 1000
          }}
        >
          <SidebarContent inDrawer />
        </Drawer>
      )}

      <Layout style={{ marginLeft: isMobile ? 0 : (collapsed ? 80 : 320) }}>
        {/* 移动端顶部Logo和菜单 */}
        {isMobile && (
          <div style={{
            position: 'fixed',
            top: 0, // Logo栏始终在最顶部
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
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
            transition: 'top 0.3s ease' // 添加平滑过渡动画
          }}>
            {/* 移动端菜单按钮 */}
            <Button
              type="text"
              icon={<MenuOutlined />}
              onClick={() => setMobileDrawerOpen(!mobileDrawerOpen)}
              style={{ 
                fontSize: '16px',
                width: 40,
                height: 40,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: mobileDrawerOpen ? 'rgba(19, 194, 194, 0.1)' : 'transparent',
                color: mobileDrawerOpen ? '#00B4A6' : '#333',
                borderRadius: '8px',
                transition: 'all 0.3s ease',
              }}
            />
            
            {/* 移动端Logo */}
            <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
              <Logo 
                size="small"
                onClick={() => {
                  router.push('/');
                  setMobileDrawerOpen(false);
                }}
              />
            </div>
            
            {/* 占位元素保持布局平衡 */}
            <div style={{ width: 40 }} />
          </div>
        )}

        {/* 用户信息 - 固定在左下角 */}
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
          paddingTop: isMobile ? (currentAudio ? 152 : 64) : (currentAudio ? 120 : 0) // 为顶部Logo和播放器留出空间
        }}>
          <div style={{
            padding: isMobile ? 16 : 24,
            minHeight: isMobile ? (currentAudio ? 'calc(100vh - 152px)' : 'calc(100vh - 64px)') : (currentAudio ? 'calc(100vh - 120px)' : '100vh'),
            background: 'transparent',
          }}>
            {children}
          </div>
        </Content>
      </Layout>
    </Layout>
    </>
  );
}