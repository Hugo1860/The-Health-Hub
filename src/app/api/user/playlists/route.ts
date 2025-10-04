/**
 * 用户播放列表管理 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity, withSecurityAndValidation } from '@/lib/secureApiWrapper';
import PlaylistService from '@/lib/playlistService';
import { z } from 'zod';

const createPlaylistSchema = z.object({
  name: z.string().min(1, '播放列表名称不能为空').max(100, '名称不能超过100个字符'),
  description: z.string().max(500, '描述不能超过500个字符').optional(),
  isPublic: z.boolean().default(false),
  isCollaborative: z.boolean().default(false),
  tags: z.array(z.string().max(20)).max(10, '标签不能超过10个').optional()
});

const addAudioSchema = z.object({
  audioId: z.string().min(1, '音频ID不能为空'),
  personalNote: z.string().max(500, '个人笔记不能超过500个字符').optional()
});

// 获取用户播放列表
export const GET = withSecurity(async (request: NextRequest) => {
  try {
    const { searchParams } = new URL(request.url);
    const includePublic = searchParams.get('includePublic') !== 'false';
    const includeCollaborative = searchParams.get('includeCollaborative') !== 'false';
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = parseInt(searchParams.get('offset') || '0');

    // 从请求上下文内获取用户ID由 secure wrapper 负责；这里简化通过 headers 读取
    const userId = request.headers.get('x-user-id') as string; // secure wrapper 会设置（当前项目结构下）
    const result = await PlaylistService.getUserPlaylists(userId, { includePublic, includeCollaborative, limit, offset });

    return NextResponse.json({
      success: true,
      data: result.playlists,
      meta: {
        total: result.total,
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('获取播放列表失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取播放列表失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, enableRateLimit: true });

// 创建播放列表
export const POST = withSecurityAndValidation(async (request: NextRequest, body: z.infer<typeof createPlaylistSchema>) => {
  try {
    const userId = request.headers.get('x-user-id') as string;
    const playlist = await PlaylistService.createPlaylist(userId, body);
    const SocialService = (await import('@/lib/socialService')).default;
    await SocialService.recordActivity(userId, 'created_playlist', 'playlist', playlist.id, { playlistName: playlist.name }, body.isPublic);
    return NextResponse.json({ success: true, data: playlist, message: '播放列表创建成功' }, { status: 201 });
  } catch (error) {
    console.error('创建播放列表失败:', error);
    return NextResponse.json({ success: false, error: { message: '创建播放列表失败', details: error instanceof Error ? error.message : '未知错误' } }, { status: 500 });
  }
}, createPlaylistSchema, { requireAuth: true, requireCSRF: true });
