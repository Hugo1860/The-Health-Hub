'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import AntdAdminLayout from '@/components/AntdAdminLayout'

interface AudioFile {
  id: string
  title: string
  description: string
  url: string
  filename: string
  uploadDate: string
  subject: string
  tags: string[]
  speaker?: string
  recordingDate?: string
  duration?: number
  transcription?: string
  chapters?: AudioChapter[]
  relatedResources?: RelatedResource[]
}

interface AudioChapter {
  id: string
  title: string
  startTime: number
  endTime?: number
  description?: string
}

interface RelatedResource {
  id: string
  title: string
  url: string
  type: 'link' | 'pdf' | 'image'
  description?: string
}

export default function EditAudioPage() {
  const { id } = useParams()
  const router = useRouter()
  const { data: session, status } = useSession()

  const [audio, setAudio] = useState<AudioFile | null>(null)
  const [loading, setLoading] = useState(true)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [subject, setSubject] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [speaker, setSpeaker] = useState('')
  const [recordingDate, setRecordingDate] = useState('')
  const [transcription, setTranscription] = useState('')
  const [chapters, setChapters] = useState<AudioChapter[]>([])
  const [relatedResources, setRelatedResources] = useState<RelatedResource[]>([])

  const [audioPlayer, setAudioPlayer] = useState<HTMLAudioElement | null>(null)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({})

  // 检查用户权限
  const isAdmin = session?.user && ['admin', 'moderator', 'editor'].includes((session.user as any).role);

  useEffect(() => {
    if (status === 'loading') return;

    if (!session?.user || !isAdmin) {
      router.push('/');
      return;
    }

    fetchAudio()
  }, [id, session, status, router, isAdmin])

  useEffect(() => {
    if (audio?.url) {
      const audioElement = new Audio(audio.url)
      setAudioPlayer(audioElement)

      const handleLoadedMetadata = () => {
        setDuration(audioElement.duration)
      }

      const handleTimeUpdate = () => {
        setCurrentTime(audioElement.currentTime)
      }

      const handleEnded = () => {
        setIsPlaying(false)
      }

      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata)
      audioElement.addEventListener('timeupdate', handleTimeUpdate)
      audioElement.addEventListener('ended', handleEnded)

      return () => {
        audioElement.pause()
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata)
        audioElement.removeEventListener('timeupdate', handleTimeUpdate)
        audioElement.removeEventListener('ended', handleEnded)
        audioElement.src = ''
      }
    }
  }, [audio])

  const fetchAudio = async () => {
    try {
      const response = await fetch(`/api/audio/${id}`, {
        credentials: 'include' // 包含认证cookie
      })
      if (!response.ok) {
        throw new Error('获取音频信息失败')
      }
      const data = await response.json()
      const audioData = data.audio || data // 处理不同的响应格式
      setAudio(audioData)
      setTitle(audioData.title)
      setDescription(audioData.description)
      setSubject(audioData.subject)
      setTags(audioData.tags || [])
      setSpeaker(audioData.speaker || '')
      setRecordingDate(audioData.recordingDate || '')
      setTranscription(audioData.transcription || '')
      setChapters(audioData.chapters || [])
      setRelatedResources(audioData.relatedResources || [])
    } catch (error) {
      console.error('获取音频信息失败:', error)
      setError('获取音频信息失败')
    } finally {
      setLoading(false)
    }
  }

  const togglePlayPause = () => {
    if (!audioPlayer) return

    if (isPlaying) {
      audioPlayer.pause()
      setIsPlaying(false)
    } else {
      audioPlayer.play()
      setIsPlaying(true)
    }
  }

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioPlayer) return
    const newTime = (parseFloat(e.target.value) / 100) * duration
    audioPlayer.currentTime = newTime
    setCurrentTime(newTime)
  }

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {}

    if (!title.trim()) {
      errors.title = '标题不能为空'
    }
    if (!subject.trim()) {
      errors.subject = '学科分类不能为空'
    }
    if (title.length > 200) {
      errors.title = '标题不能超过200个字符'
    }
    if (description.length > 2000) {
      errors.description = '描述不能超过2000个字符'
    }
    if (tags.length > 10) {
      errors.tags = '标签数量不能超过10个'
    }

    setValidationErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) {
      setError('请修正表单中的错误')
      return
    }

    setIsUpdating(true)
    setMessage('')
    setError('')

    try {
      const updateData = {
        title,
        description,
        subject,
        tags,
        speaker,
        recordingDate,
        transcription,
        chapters,
        relatedResources
      }

      const response = await fetch(`/api/audio/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
        credentials: 'include' // 包含认证cookie
      })

      const result = await response.json()

      if (response.ok) {
        setMessage('更新成功！')
        setTimeout(() => setMessage(''), 3000)
      } else {
        setError(`更新失败：${result.error || '未知错误'}`)
      }
    } catch (error) {
      console.error('更新失败:', error)
      setError('更新失败：网络错误')
    } finally {
      setIsUpdating(false)
    }
  }

  const addChapter = () => {
    setChapters([...chapters, {
      id: Date.now().toString(),
      title: '',
      startTime: 0,
      description: ''
    }])
  }

  const updateChapter = (chapterId: string, field: keyof AudioChapter, value: any) => {
    setChapters(chapters.map(chapter =>
      chapter.id === chapterId ? { ...chapter, [field]: value } : chapter
    ))
  }

  const removeChapter = (chapterId: string) => {
    setChapters(chapters.filter(chapter => chapter.id !== chapterId))
  }

  const addResource = () => {
    setRelatedResources([...relatedResources, {
      id: Date.now().toString(),
      title: '',
      url: '',
      type: 'link',
      description: ''
    }])
  }

  const updateResource = (resourceId: string, field: keyof RelatedResource, value: any) => {
    setRelatedResources(relatedResources.map(resource =>
      resource.id === resourceId ? { ...resource, [field]: value } : resource
    ))
  }

  const removeResource = (resourceId: string) => {
    setRelatedResources(relatedResources.filter(resource => resource.id !== resourceId))
  }

  if (status === 'loading' || loading) {
    return (
      <AntdAdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-lg text-gray-600">加载中...</div>
        </div>
      </AntdAdminLayout>
    )
  }

  if (!session?.user || !isAdmin) {
    return (
      <AntdAdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-red-600">您没有权限访问此页面</div>
        </div>
      </AntdAdminLayout>
    )
  }

  if (!audio) {
    return (
      <AntdAdminLayout>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-red-600">音频不存在</div>
        </div>
      </AntdAdminLayout>
    )
  }

  return (
    <AntdAdminLayout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
              <h1 className="text-2xl font-bold text-gray-900">编辑音频</h1>
              <button
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-900"
              >
                返回
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2">
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                      标题 *
                    </label>
                    <input
                      id="title"
                      type="text"
                      value={title}
                      onChange={(e) => {
                        setTitle(e.target.value)
                        setValidationErrors({ ...validationErrors, title: '' })
                      }}
                      required
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${validationErrors.title ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                    />
                    {validationErrors.title && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.title}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-2">
                      描述 *
                    </label>
                    <textarea
                      id="description"
                      value={description}
                      onChange={(e) => {
                        setDescription(e.target.value)
                        setValidationErrors({ ...validationErrors, description: '' })
                      }}
                      required
                      rows={3}
                      maxLength={2000}
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${validationErrors.description ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                    />
                    <div className="flex justify-between text-sm text-gray-500 mt-1">
                      <span>{description.length}/2000</span>
                    </div>
                    {validationErrors.description && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.description}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-2">
                      学科分类 *
                    </label>
                    <select
                      id="subject"
                      value={subject}
                      onChange={(e) => {
                        setSubject(e.target.value)
                        setValidationErrors({ ...validationErrors, subject: '' })
                      }}
                      required
                      className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 ${validationErrors.subject ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-blue-500'
                        }`}
                    >
                      <option value="">选择学科</option>
                      <option value="人工智能">人工智能</option>
                      <option value="机器学习">机器学习</option>
                      <option value="深度学习">深度学习</option>
                      <option value="自然语言处理">自然语言处理</option>
                      <option value="计算机视觉">计算机视觉</option>
                    </select>
                    {validationErrors.subject && (
                      <p className="mt-1 text-sm text-red-600">{validationErrors.subject}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
                      标签 (用逗号分隔)
                    </label>
                    <input
                      id="tags"
                      type="text"
                      value={tags.join(', ')}
                      onChange={(e) => setTags(e.target.value.split(',').map(tag => tag.trim()).filter(tag => tag))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="speaker" className="block text-sm font-medium text-gray-700 mb-2">
                      演讲者
                    </label>
                    <input
                      id="speaker"
                      type="text"
                      value={speaker}
                      onChange={(e) => setSpeaker(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="recordingDate" className="block text-sm font-medium text-gray-700 mb-2">
                      录制日期
                    </label>
                    <input
                      id="recordingDate"
                      type="date"
                      value={recordingDate}
                      onChange={(e) => setRecordingDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label htmlFor="transcription" className="block text-sm font-medium text-gray-700 mb-2">
                      转录文本
                    </label>
                    <textarea
                      id="transcription"
                      value={transcription}
                      onChange={(e) => setTranscription(e.target.value)}
                      rows={8}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />
                    <p className="text-xs text-gray-500 mt-1">支持Markdown格式</p>
                  </div>

                  {/* 章节管理 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">章节管理</h3>
                    <div className="space-y-3">
                      {chapters.map((chapter) => (
                        <div key={chapter.id} className="p-4 border border-gray-200 rounded-md">
                          <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-5">
                              <input
                                type="text"
                                placeholder="章节标题"
                                value={chapter.title}
                                onChange={(e) => updateChapter(chapter.id, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                placeholder="开始时间(秒)"
                                value={chapter.startTime}
                                onChange={(e) => updateChapter(chapter.id, 'startTime', parseInt(e.target.value) || 0)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div className="col-span-3">
                              <input
                                type="number"
                                placeholder="结束时间(秒)"
                                value={chapter.endTime || ''}
                                onChange={(e) => updateChapter(chapter.id, 'endTime', e.target.value ? parseInt(e.target.value) : undefined)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div className="col-span-1">
                              <button
                                type="button"
                                onClick={() => removeChapter(chapter.id)}
                                className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <textarea
                            placeholder="章节描述(可选)"
                            value={chapter.description || ''}
                            onChange={(e) => updateChapter(chapter.id, 'description', e.target.value)}
                            rows={2}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addChapter}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        + 添加章节
                      </button>
                    </div>
                  </div>

                  {/* 相关资源管理 */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-3">相关资源</h3>
                    <div className="space-y-3">
                      {relatedResources.map((resource) => (
                        <div key={resource.id} className="p-4 border border-gray-200 rounded-md">
                          <div className="grid grid-cols-12 gap-3">
                            <div className="col-span-4">
                              <input
                                type="text"
                                placeholder="资源标题"
                                value={resource.title}
                                onChange={(e) => updateResource(resource.id, 'title', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div className="col-span-4">
                              <input
                                type="url"
                                placeholder="资源链接"
                                value={resource.url}
                                onChange={(e) => updateResource(resource.id, 'url', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              />
                            </div>
                            <div className="col-span-3">
                              <select
                                value={resource.type}
                                onChange={(e) => updateResource(resource.id, 'type', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                              >
                                <option value="link">链接</option>
                                <option value="pdf">PDF</option>
                                <option value="image">图片</option>

                              </select>
                            </div>
                            <div className="col-span-1">
                              <button
                                type="button"
                                onClick={() => removeResource(resource.id)}
                                className="w-full px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                              >
                                删除
                              </button>
                            </div>
                          </div>
                          <textarea
                            placeholder="资源描述(可选)"
                            value={resource.description || ''}
                            onChange={(e) => updateResource(resource.id, 'description', e.target.value)}
                            rows={2}
                            className="w-full mt-2 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={addResource}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                      >
                        + 添加相关资源
                      </button>
                    </div>
                  </div>

                  {message && (
                    <div className="text-green-600 text-sm text-center bg-green-50 p-3 rounded-md">
                      {message}
                    </div>
                  )}

                  {error && (
                    <div className="text-red-600 text-sm text-center bg-red-50 p-3 rounded-md">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isUpdating ? '更新中...' : '保存更改'}
                  </button>
                </form>
              </div>

              <div className="lg:col-span-1">
                <div className="bg-gray-50 p-4 rounded-md sticky top-4">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">音频预览</h3>

                  <div className="bg-white p-4 rounded-md">
                    <div className="text-sm text-gray-600 mb-2">
                      时长: {audio.duration ? formatTime(audio.duration) : '未知'}
                    </div>

                    {audioPlayer && (
                      <div className="space-y-3">
                        <button
                          onClick={togglePlayPause}
                          className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 flex items-center justify-center gap-2"
                        >
                          {isPlaying ? <PauseCircleOutlined /> : <PlayCircleOutlined />}
                          {isPlaying ? '暂停' : '播放'}
                        </button>

                        <div className="text-center text-sm">
                          {formatTime(currentTime)} / {formatTime(duration)}
                        </div>
                        {audio.duration && (
                          <div className="text-xs text-gray-500 mt-1">
                            总时长: {Math.floor(audio.duration / 60)}分{audio.duration % 60}秒
                          </div>
                        )}

                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={duration ? (currentTime / duration) * 100 : 0}
                          onChange={handleSeek}
                          className="w-full"
                        />
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AntdAdminLayout>
  )
}