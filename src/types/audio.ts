/**
 * 音频相关类型定义
 * 包含分类层级支持
 */

import { Category } from './category';

// 音频状态枚举
export enum AudioStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published',
  ARCHIVED = 'archived'
}

// 基础音频接口
export interface BaseAudio {
  id: string;
  title: string;
  description?: string;
  filename: string;
  url: string;
  coverImage?: string;
  uploadDate: string;
  size?: number;
  duration?: number;
  speaker?: string;
  recordingDate?: string;
  status: AudioStatus;
}

// 扩展音频接口（包含分类信息）
export interface Audio extends BaseAudio {
  // 分类字段
  categoryId?: string;
  subcategoryId?: string;
  
  // 标签字段
  tags?: string[] | string;
  
  // 关联数据
  category?: Category;
  subcategory?: Category;
  
  // 统计数据
  averageRating?: number;
  ratingCount?: number;
  commentCount?: number;
  playCount?: number;
  favoriteCount?: number;
}

// 音频查询参数接口
export interface AudioQueryParams {
  // 分类筛选
  categoryId?: string;
  subcategoryId?: string;
  categoryPath?: string;
  
  // 搜索
  search?: string;
  
  // 分页
  page?: number;
  limit?: number;
  
  // 排序
  sortBy?: 'uploadDate' | 'title' | 'duration' | 'rating' | 'playCount';
  sortOrder?: 'asc' | 'desc';
  
  // 筛选
  status?: AudioStatus;
  speaker?: string;
  hasTranscription?: boolean;
  minDuration?: number;
  maxDuration?: number;
  
  // 日期范围
  dateFrom?: string;
  dateTo?: string;
}

// 音频创建请求接口
export interface CreateAudioRequest {
  title: string;
  description?: string;
  filename: string;
  url: string;
  coverImage?: string;
  categoryId?: string;
  subcategoryId?: string;
  tags?: string[];
  speaker?: string;
  recordingDate?: string;
  status?: AudioStatus;
}

// 音频更新请求接口
export interface UpdateAudioRequest {
  title?: string;
  description?: string;
  coverImage?: string;
  categoryId?: string;
  subcategoryId?: string;
  tags?: string[];
  speaker?: string;
  recordingDate?: string;
  status?: AudioStatus;
}

// 音频列表响应接口
export interface AudioListResponse {
  success: boolean;
  data: Audio[];
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 音频详情响应接口
export interface AudioDetailResponse {
  success: boolean;
  data?: Audio;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
}

// 音频统计接口
export interface AudioStats {
  totalAudios: number;
  publishedAudios: number;
  draftAudios: number;
  archivedAudios: number;
  totalDuration: number;
  averageDuration: number;
  totalSize: number;
  averageRating: number;
  totalPlays: number;
  totalComments: number;
  totalFavorites: number;
  categorizedAudios: number;
  uncategorizedAudios: number;
}

// 音频分类统计接口
export interface AudioCategoryStats {
  categoryId: string;
  categoryName: string;
  level: number;
  audioCount: number;
  totalDuration: number;
  averageRating: number;
  subcategories?: AudioCategoryStats[];
}

// 音频上传进度接口
export interface AudioUploadProgress {
  audioId?: string;
  filename: string;
  progress: number;
  status: 'uploading' | 'processing' | 'completed' | 'error';
  error?: string;
  url?: string;
  duration?: number;
  size?: number;
}

// 音频播放状态接口
export interface AudioPlayState {
  audioId: string;
  position: number;
  duration: number;
  isPlaying: boolean;
  volume: number;
  playbackRate: number;
  sessionId: string;
  lastUpdated: string;
}

// 音频筛选器接口
export interface AudioFilter {
  categories?: string[];
  subcategories?: string[];
  status?: AudioStatus[];
  speakers?: string[];
  tags?: string[];
  dateRange?: {
    start: string;
    end: string;
  };
  durationRange?: {
    min: number;
    max: number;
  };
  ratingRange?: {
    min: number;
    max: number;
  };
  hasTranscription?: boolean;
  hasCoverImage?: boolean;
}

// 音频搜索结果接口
export interface AudioSearchResult {
  audio: Audio;
  highlights: {
    title?: string[];
    description?: string[];
    transcription?: string[];
  };
  score: number;
}

// 音频推荐接口
export interface AudioRecommendation {
  audio: Audio;
  reason: 'similar_category' | 'same_speaker' | 'high_rating' | 'popular' | 'recent';
  score: number;
}

// 音频批量操作接口
export interface AudioBatchOperation {
  type: 'categorize' | 'status_change' | 'delete' | 'move';
  audioIds: string[];
  categoryId?: string;
  subcategoryId?: string;
  status?: AudioStatus;
  targetLocation?: string;
}

// 音频导入导出接口
export interface AudioExportData {
  audios: Audio[];
  exportTime: string;
  version: string;
  metadata: AudioStats;
}

export interface AudioImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
  warnings: string[];
  duplicates: string[];
}

// 音频转录接口
export interface AudioTranscription {
  id: string;
  audioId: string;
  language: string;
  fullText: string;
  segments: TranscriptionSegment[];
  status: 'pending' | 'processing' | 'completed' | 'error';
  processingTime?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
  confidence?: number;
}

// 音频章节接口
export interface AudioChapter {
  id: string;
  audioId: string;
  title: string;
  description?: string;
  startTime: number;
  endTime: number;
  chapterOrder: number;
  createdAt: string;
  updatedAt: string;
}

// 音频标记接口
export interface AudioMarker {
  id: string;
  audioId: string;
  title: string;
  description?: string;
  timePosition: number;
  markerType: 'note' | 'bookmark' | 'highlight' | 'question';
  createdBy: string;
  createdAt: string;
}

// 音频评分接口
export interface AudioRating {
  id: string;
  audioId: string;
  userId: string;
  rating: number; // 1-5
  review?: string;
  createdAt: string;
}

// 音频评论接口
export interface AudioComment {
  id: string;
  audioId: string;
  userId: string;
  username: string;
  content: string;
  parentId?: string;
  timePosition?: number;
  createdAt: string;
  updatedAt: string;
  replies?: AudioComment[];
}

// 音频收藏接口
export interface AudioFavorite {
  id: string;
  audioId: string;
  userId: string;
  createdAt: string;
  audio?: Audio;
}

// 音频播放历史接口
export interface AudioPlayHistory {
  id: string;
  audioId: string;
  userId: string;
  position: number;
  duration: number;
  completedPercentage: number;
  playedAt: string;
  audio?: Audio;
}