'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAudioStore, AudioFile } from '../../../store/audioStore'
import Link from 'next/link'
import Head from 'next/head'
import {
  Layout,
  Card,
  Row,
  Col,
  Typography,
  Button,
  Breadcrumb,
  Spin,
  Result,
  BackTop,
  Space,
  Grid,
  Input,
  List,
  Empty,
  Alert,
  Descriptions,
  Avatar,
  Tag,
  Divider,
  Tooltip,
  Badge,
  Statistic,
  message
} from 'antd'
import {
  HomeOutlined,
  SoundOutlined,
  ArrowLeftOutlined,
  PlayCircleOutlined,
  PauseCircleOutlined,
  HeartOutlined,
  ShareAltOutlined,
  ClockCircleOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  SearchOutlined
} from '@ant-design/icons'
import { useAuth } from '../../../contexts/AuthContext'
import ClientOnly from '../../../components/ClientOnly'
import SafeTimeDisplay from '../../../components/SafeTimeDisplay'


const { Content } = Layout
const { Title, Paragraph } = Typography
const { useBreakpoint } = Grid

export default function AudioDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { setCurrentAudio } = useAudioStore()
  const router = useRouter()
  const searchParams = useSearchParams()
  const screens = useBreakpoint()
  
  const [audioId, setAudioId] = useState<string>('')
  const [audio, setAudio] = useState<AudioFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentTime, setCurrentTime] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<any[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [isFavorited, setIsFavorited] = useState(false)
  const [favoriteLoading, setFavoriteLoading] = useState(false)
  const [shareLoading, setShareLoading] = useState(false)

  // 判断是否为移动端
  const isMobile = !screens.md
  
  // 获取用户认证信息
  const { user } = useAuth()

  useEffect(() => {
    const initParams = async () => {
      const resolvedParams = await params
      setAudioId(resolvedParams.id)
    }
    initParams()
  }, [params])

  useEffect(() => {
    if (audioId) {
      fetchAudio()
      
      // 检查URL参数中的搜索查询和时间戳
      const search = searchParams.get('search')
      const timeParam = searchParams.get('t')
      
      if (search) {
        setSearchQuery(search)
        performSearch(search)
      }
      
      if (timeParam) {
        const time = parseFloat(timeParam)
        if (!isNaN(time)) {
          // 延迟跳转，确保音频已加载
          setTimeout(() => {
            handleSeekTo(time)
          }, 1000)
        }
      }
      
      // 检查收藏状态
      if (user) {
        checkFavoriteStatus()
      }
    }
  }, [audioId, searchParams, user])

  const fetchAudio = async () => {
    try {
      const response = await fetch(`/api/audio/${audioId}`)
      if (response.ok) {
        const data = await response.json()
        setAudio(data.audio)
      } else {
        if (response.status === 404) {
          setError('音频不存在')
        } else {
          setError('获取音频信息失败')
        }
      }
    } catch (error) {
      console.error('获取音频信息失败:', error)
      setError('获取音频信息失败')
    } finally {
      setLoading(false)
    }
  }

  const handlePlay = (startPosition?: number) => {
    if (!audio) return
    
    setCurrentAudio(audio)
    
    // 触发播放事件
    const event = new CustomEvent('playAudio', { 
      detail: { 
        ...audio, 
        startPosition: startPosition || 0 
      } 
    })
    window.dispatchEvent(event)
  }

  const handleSeekTo = (time: number) => {
    // 触发跳转到指定时间的事件
    const event = new CustomEvent('seekToTime', { 
      detail: { 
        audioId: audio?.id,
        time 
      } 
    })
    window.dispatchEvent(event)
    
    // 如果音频没有在播放，则开始播放
    handlePlay(time)
  }

  // 监听音频时间更新事件
  useEffect(() => {
    const handleTimeUpdate = (event: CustomEvent) => {
      if (event.detail?.audioId === audioId) {
        setCurrentTime(event.detail.currentTime || 0)
      }
    }

    window.addEventListener('audioTimeUpdate', handleTimeUpdate as EventListener)
    
    return () => {
      window.removeEventListener('audioTimeUpdate', handleTimeUpdate as EventListener)
    }
  }, [audioId])

  // 执行搜索
  const performSearch = async (query: string) => {
    if (!query.trim() || query.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    try {
      const response = await fetch(`/api/transcriptions/search?q=${encodeURIComponent(query.trim())}&audioId=${audioId}`)
      if (response.ok) {
        const data = await response.json()
        const currentAudioResults = data.results.find((r: any) => r.transcription.audioId === audioId)
        setSearchResults(currentAudioResults?.matches || [])
        setShowSearchResults(true)
      }
    } catch (error) {
      console.error('Search error:', error)
      setSearchResults([])
    }
  }

  // 检查收藏状态
  const checkFavoriteStatus = async () => {
    if (!user || !audioId) return
    
    try {
      const response = await fetch(`/api/favorites?audioId=${audioId}`)
      if (response.ok) {
        const data = await response.json()
        setIsFavorited(data.isFavorited)
      }
    } catch (error) {
      console.error('检查收藏状态失败:', error)
    }
  }

  // 切换收藏状态
  const handleToggleFavorite = async () => {
    if (!user) {
      message.warning('请先登录')
      return
    }

    setFavoriteLoading(true)
    try {
      if (isFavorited) {
        // 取消收藏
        const response = await fetch(`/api/favorites?audioId=${audioId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          setIsFavorited(false)
          message.success('已取消收藏')
        } else {
          const data = await response.json()
          message.error(data.error || '取消收藏失败')
        }
      } else {
        // 添加收藏
        const response = await fetch('/api/favorites', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ audioId })
        })

        if (response.ok) {
          setIsFavorited(true)
          message.success('收藏成功')
        } else {
          const data = await response.json()
          message.error(data.error || '收藏失败')
        }
      }
    } catch (error) {
      message.error('操作失败，请稍后重试')
    } finally {
      setFavoriteLoading(false)
    }
  }

  // 分享功能
  const handleShare = async () => {
    if (!audio) return
    
    setShareLoading(true)
    try {
      const shareUrl = `${window.location.origin}/audio/${audioId}`
      const shareText = `${audio.title} - 医学生物科技音频博客`
      
      // 尝试使用原生分享API
      if (navigator.share) {
        await navigator.share({
          title: shareText,
          text: audio.description || `收听这个精彩的医学音频内容：${audio.title}`,
          url: shareUrl
        })
        message.success('分享成功')
      } else {
        // 降级到复制链接
        await navigator.clipboard.writeText(shareUrl)
        message.success('链接已复制到剪贴板')
      }
    } catch (error: unknown) {
      // 如果分享被取消或失败，尝试复制链接
      const isAbortError =
        error instanceof Error
          ? error.name === 'AbortError'
          : typeof (error as any)?.name === 'string' && (error as any).name === 'AbortError'
      
      if (!isAbortError) { // 用户取消分享不显示错误
        try {
          const shareUrl = `${window.location.origin}/audio/${audioId}`
          await navigator.clipboard.writeText(shareUrl)
          message.success('链接已复制到剪贴板')
        } catch (clipboardError: unknown) {
          message.error('分享失败，请稍后重试')
        }
      }
    } finally {
      setShareLoading(false)
    }
  }

  // 高亮搜索结果
  const getHighlightedText = (text: string, query: string) => {
    if (!query.trim()) return text
    
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    return text.replace(regex, '<mark style="background-color: #fff2e6; padding: 2px 4px; border-radius: 4px; font-weight: 500;">$1</mark>')
  }

  if (loading) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: '24px'
        }}>
          <Spin size="large" tip="加载中..." />
        </Content>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: '24px' }}>
          <Row justify="center">
            <Col xs={24} sm={20} md={16} lg={12}>
              <Result
                status="error"
                title="加载失败"
                subTitle={error}
                extra={
                  <Link href="/">
                    <Button type="primary" icon={<HomeOutlined />}>
                      返回首页
                    </Button>
                  </Link>
                }
              />
            </Col>
          </Row>
        </Content>
      </Layout>
    )
  }

  if (!audio) {
    return null
  }

  return (
    <>
      <Head>
        <title>{audio.title} - 医学生物科技音频博客</title>
        <meta name="description" content={audio.description || `收听这个精彩的医学音频内容：${audio.title}`} />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="article" />
        <meta property="og:title" content={`${audio.title} - 医学生物科技音频博客`} />
        <meta property="og:description" content={audio.description || `收听这个精彩的医学音频内容：${audio.title}`} />
        <meta property="og:site_name" content="医学生物科技音频博客" />
        
        {/* Twitter */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={`${audio.title} - 医学生物科技音频博客`} />
        <meta name="twitter:description" content={audio.description || `收听这个精彩的医学音频内容：${audio.title}`} />
      </Head>
      
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ padding: isMobile ? '16px' : '24px' }}>
          <Row justify="center">
            <Col xs={24} sm={22} md={20} lg={18} xl={16}>
              {/* 面包屑导航 */}
              <Breadcrumb 
                style={{ marginBottom: 16 }}
                items={[
                  {
                    title: (
                      <Link href="/">
                        <Space>
                          <HomeOutlined />
                          音频
                        </Space>
                      </Link>
                    )
                  },
                  {
                    title: (
                      <Link href={`/?subject=${encodeURIComponent(audio.subject || '')}`}>
                        {audio.subject || '未分类'}
                      </Link>
                    )
                  },
                  {
                    title: audio.title
                  }
                ]}
              />

              {/* 音频信息卡片 */}
              <Card 
                style={{ marginBottom: 24 }}
                actions={[
                  <Tooltip key="play" title="播放音频">
                    <Button 
                      type="primary" 
                      icon={<PlayCircleOutlined />} 
                      size="large"
                      onClick={() => handlePlay()}
                    >
                      播放
                    </Button>
                  </Tooltip>,
                  <Tooltip key="favorite" title={isFavorited ? "取消收藏" : "收藏"}>
                    <Button 
                      icon={<HeartOutlined />} 
                      size="large"
                      loading={favoriteLoading}
                      onClick={handleToggleFavorite}
                      type={isFavorited ? "primary" : "default"}
                      danger={isFavorited}
                      disabled={!user}
                    >
                      {isFavorited ? "已收藏" : "收藏"}
                    </Button>
                  </Tooltip>,
                  <Tooltip key="share" title="分享音频">
                    <Button 
                      icon={<ShareAltOutlined />} 
                      size="large"
                      loading={shareLoading}
                      onClick={handleShare}
                    >
                      分享
                    </Button>
                  </Tooltip>,
                  <Link key="back" href="/">
                    <Button icon={<ArrowLeftOutlined />} size="large">
                      返回首页
                    </Button>
                  </Link>
                ]}
              >
                <Row gutter={[24, 16]} align="top">
                  <Col xs={24} sm={4} md={3}>
                    <Avatar 
                      size={isMobile ? 64 : 80}
                      icon={<SoundOutlined />}
                      style={{ 
                        backgroundColor: '#13C2C2',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    />
                  </Col>
                  
                  <Col xs={24} sm={20} md={21}>
                    <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                      <div>
                        <Title level={isMobile ? 3 : 2} style={{ margin: 0, marginBottom: 8 }}>
                          {audio.title}
                        </Title>
                        
                        <Space size="small" wrap>
                          <Tag color="blue" icon={<FileTextOutlined />}>
                            {audio.subject || '未分类'}
                          </Tag>
                          <Tag color="green" icon={<CalendarOutlined />}>
                            <SafeTimeDisplay timestamp={audio.uploadDate} format="date" />
                          </Tag>
                          {audio.duration && (
                            <Tag color="orange" icon={<ClockCircleOutlined />}>
                              {Math.floor(audio.duration / 60)}:{(audio.duration % 60).toFixed(0).padStart(2, '0')}
                            </Tag>
                          )}
                        </Space>
                      </div>
                      
                      {audio.description && (
                        <Paragraph 
                          style={{ 
                            margin: 0, 
                            fontSize: 16,
                            color: '#666',
                            lineHeight: 1.6
                          }}
                          ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
                        >
                          {audio.description}
                        </Paragraph>
                      )}
                      
                      <Descriptions 
                        size="small" 
                        column={isMobile ? 1 : 2}
                        bordered={false}
                        colon={false}
                      >
                        <Descriptions.Item 
                          label={<Space><UserOutlined />上传者</Space>}
                        >
                          管理员
                        </Descriptions.Item>
                        <Descriptions.Item 
                          label={<Space><ClockCircleOutlined />上传时间</Space>}
                        >
                          <SafeTimeDisplay timestamp={audio.uploadDate} format="datetime" />
                        </Descriptions.Item>
                        {audio.tags && audio.tags.length > 0 && (
                          <Descriptions.Item 
                            label="标签" 
                            span={isMobile ? 1 : 2}
                          >
                            <Space size="small" wrap>
                              {audio.tags.map((tag, index) => (
                                <Tag key={index} color="processing">
                                  {tag}
                                </Tag>
                              ))}
                            </Space>
                          </Descriptions.Item>
                        )}
                      </Descriptions>
                    </Space>
                  </Col>
                </Row>

              </Card>

              {/* 搜索功能 */}
              <Card 
                title={
                  <Space>
                    <SearchOutlined style={{ color: '#00529B' }} />
                    <span>搜索此音频</span>
                    {showSearchResults && searchResults.length > 0 && (
                      <Badge count={searchResults.length} style={{ backgroundColor: '#52c41a' }} />
                    )}
                  </Space>
                }
                style={{ marginBottom: 24 }}
                size={isMobile ? "small" : "default"}
                extra={
                  searchQuery && (
                    <Button 
                      size="small" 
                      onClick={() => {
                        setSearchQuery('')
                        setSearchResults([])
                        setShowSearchResults(false)
                      }}
                    >
                      清除
                    </Button>
                  )
                }
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <Input.Search
                    placeholder="在此音频中搜索内容..."
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value)
                      if (e.target.value.trim()) {
                        performSearch(e.target.value)
                      } else {
                        setSearchResults([])
                        setShowSearchResults(false)
                      }
                    }}
                    size="large"
                    allowClear
                    enterButton="搜索"
                  />

                  {/* 搜索结果 */}
                  {showSearchResults && searchResults.length > 0 && (
                    <>
                      <Divider orientation="left">
                        <Space>
                          <Badge count={searchResults.length} style={{ backgroundColor: '#52c41a' }} />
                          <span>搜索结果</span>
                        </Space>
                      </Divider>
                      
                      <List
                        dataSource={searchResults}
                        renderItem={(match: any, index: number) => (
                          <List.Item
                            key={`${match.segment.id}-${index}`}
                            actions={[
                              <Tooltip key="jump" title="跳转到此时间点播放">
                                <Button
                                  type="primary"
                                  size="small"
                                  icon={<PlayCircleOutlined />}
                                  onClick={() => handleSeekTo(match.segment.startTime)}
                                >
                                  跳转播放
                                </Button>
                              </Tooltip>
                            ]}
                          >
                            <List.Item.Meta
                              avatar={
                                <Avatar 
                                  size="small" 
                                  style={{ backgroundColor: '#f56a00' }}
                                >
                                  {index + 1}
                                </Avatar>
                              }
                              description={
                                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                  <Typography.Text
                                    style={{ fontSize: 14, lineHeight: 1.6 }}
                                    dangerouslySetInnerHTML={{
                                      __html: getHighlightedText(match.segment.text, searchQuery)
                                    }}
                                  />
                                  <Space size="small">
                                    <Tag color="blue" icon={<ClockCircleOutlined />}>
                                      {Math.floor(match.segment.startTime / 60)}:{(match.segment.startTime % 60).toFixed(0).padStart(2, '0')}
                                    </Tag>
                                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                                      至 {Math.floor(match.segment.endTime / 60)}:{(match.segment.endTime % 60).toFixed(0).padStart(2, '0')}
                                    </Typography.Text>
                                  </Space>
                                </Space>
                              }
                            />
                          </List.Item>
                        )}
                      />
                    </>
                  )}

                  {showSearchResults && searchResults.length === 0 && searchQuery.trim() && (
                    <Empty
                      image={Empty.PRESENTED_IMAGE_SIMPLE}
                      description={
                        <Space direction="vertical" align="center">
                          <Typography.Text type="secondary">
                            在此音频中未找到匹配的内容
                          </Typography.Text>
                          <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                            尝试使用不同的关键词搜索
                          </Typography.Text>
                        </Space>
                      }
                    />
                  )}
                </Space>
              </Card>

              {/* 转录文本 */}
              {false && (
                <Card 
                  title={
                    <Space>
                      <FileTextOutlined style={{ color: '#00529B' }} />
                      <span>转录文本</span>
                      <Tag color="processing">全文</Tag>
                    </Space>
                  }
                  style={{ marginBottom: 24 }}
                  size={isMobile ? "small" : "default"}
                  extra={
                    <Space>
                      <Statistic 
                        title="字数" 
                        value={0} 
                        suffix="字"
                        style={{ minWidth: 80 }}
                      />
                    </Space>
                  }
                >
                  <div style={{ 
                    backgroundColor: '#fafafa',
                    padding: '16px',
                    borderRadius: '6px',
                    border: '1px solid #f0f0f0'
                  }}>
                    <Paragraph
                      style={{ 
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.8,
                        fontSize: 14,
                        margin: 0,
                        color: '#262626'
                      }}
                      dangerouslySetInnerHTML={{
                        __html: "转录功能暂时不可用"
                      }}
                    />
                  </div>
                </Card>
              )}

              {/* 音频统计信息 */}
              <ClientOnly>
                <Card
                  title={
                    <Space>
                      <SoundOutlined style={{ color: '#00529B' }} />
                      <span>音频统计</span>
                    </Space>
                  }
                  style={{ marginBottom: 24 }}
                  size={isMobile ? "small" : "default"}
                >
                  <Row gutter={16}>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="播放次数"
                        value={0}
                        prefix={<PlayCircleOutlined />}
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="文件大小"
                        value={0}
                        suffix="MB"
                      />
                    </Col>
                    <Col xs={12} sm={6}>
                      <div>
                        <div style={{ fontSize: '14px', color: '#8c8c8c', marginBottom: '4px' }}>上传时间</div>
                        <SafeTimeDisplay timestamp={audio.uploadDate} format="date" />
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <Statistic
                        title="音频时长"
                        value={audio.duration ? `${Math.floor(audio.duration / 60)}:${(audio.duration % 60).toFixed(0).padStart(2, '0')}` : '--'}
                      />
                    </Col>
                  </Row>
                </Card>
              </ClientOnly>

              {/* 相关音频推荐 */}
              <Card
                title={
                  <Space>
                    <SoundOutlined style={{ color: '#00529B' }} />
                    <span>相关推荐</span>
                    <Tag color="processing">同类音频</Tag>
                  </Space>
                }
                style={{ marginBottom: 24 }}
                size={isMobile ? "small" : "default"}
              >
                <div style={{ textAlign: 'center', padding: '40px 0' }}>
                  <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="暂无相关推荐"
                  />
                </div>
              </Card>
              
            </Col>
          </Row>
        </Content>
        
        {/* 返回顶部按钮 */}
        <BackTop />
      </Layout>
    </>
  )
}