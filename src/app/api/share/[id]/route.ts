import { NextRequest, NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

const AUDIO_LIST_FILE = join(process.cwd(), 'data', 'audio-list.json')

interface AudioFile {
  id: string
  title: string
  description: string
  url: string
  filename: string
  "uploadDate": string
  subject: string
  tags: string[]
  speaker?: string
  "recordingDate"?: string
  duration?: number
  transcription?: string
}

// 获取音频列表
async function getAudioList(): Promise<AudioFile[]> {
  try {
    const data = await readFile(AUDIO_LIST_FILE, 'utf-8')
    return JSON.parse(data)
  } catch (error) {
    return []
  }
}

// 获取分享预览信息
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const audioList = await getAudioList()
    const audio = audioList.find(item => item.id === id)
    
    if (!audio) {
      return NextResponse.json(
        { error: '音频不存在' },
        { status: 404 }
      )
    }
    
    // 生成分享预览信息
    const shareData = {
      title: `${audio.title} - 医学生物科技音频博客`,
      description: audio.description || `收听这个精彩的医学音频内容：${audio.title}`,
      url: `${request.nextUrl.origin}/audio/${audio.id}`,
      image: `${request.nextUrl.origin}/api/share/${audio.id}/image`, // 可以生成动态图片
      audio: {
        id: audio.id,
        title: audio.title,
        description: audio.description,
        subject: audio.subject,
        tags: audio.tags,
        speaker: audio.speaker, uploadDate: audio.uploadDate, recordingDate: audio.recordingDate
      },
      meta: {
        'og:title': `${audio.title} - 医学生物科技音频博客`,
        'og:description': audio.description || `收听这个精彩的医学音频内容：${audio.title}`,
        'og:url': `${request.nextUrl.origin}/audio/${audio.id}`,
        'og:type': 'article',
        'og:site_name': '医学生物科技音频博客',
        'twitter:card': 'summary_large_image',
        'twitter:title': `${audio.title} - 医学生物科技音频博客`,
        'twitter:description': audio.description || `收听这个精彩的医学音频内容：${audio.title}`,
        'twitter:url': `${request.nextUrl.origin}/audio/${audio.id}`
      }
    }
    
    return NextResponse.json(shareData)
    
  } catch (error) {
    console.error('Get share preview error:', error)
    return NextResponse.json(
      { error: '获取分享预览失败' },
      { status: 500 }
    )
  }
}