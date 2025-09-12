// Admin dashboard types

// 活动类型枚举
export enum ActivityType {
  AUDIO_UPLOAD = 'audio_upload',
  USER_REGISTER = 'user_register',
  COMMENT_POST = 'comment_post',
  USER_LOGIN = 'user_login',
  AUDIO_PLAY = 'audio_play',
  FAVORITE_ADD = 'favorite_add',
  PLAYLIST_CREATE = 'playlist_create'
}

// 活动数据接口
export interface RecentActivity {
  id: string
  type: ActivityType
  title: string
  description: string
  userId?: string
  username?: string
  targetId?: string // 目标资源ID（如音频ID、评论ID等）
  targetTitle?: string // 目标资源标题
  timestamp: string
  metadata?: Record<string, any>
}