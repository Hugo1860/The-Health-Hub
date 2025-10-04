/**
 * 用户社交功能 API
 */

import { NextRequest, NextResponse } from 'next/server';
import { withSecurity } from '@/lib/secureApiWrapper';
import SocialService from '@/lib/socialService';
import { z } from 'zod';

const followSchema = z.object({
  followingId: z.string().min(1, '关注对象ID不能为空'),
  followType: z.enum(['user', 'speaker', 'category']).default('user')
});

const likeSchema = z.object({
  audioId: z.string().min(1, '音频ID不能为空')
});

const shareSchema = z.object({
  contentType: z.enum(['audio', 'playlist', 'category']),
  contentId: z.string().min(1, '内容ID不能为空'),
  shareMethod: z.enum(['link', 'social', 'email', 'qr_code']),
  sharePlatform: z.string().optional(),
  shareData: z.record(z.any()).optional()
});

// 获取社交统计
export const GET = withSecurity(async (request) => {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const userId = request.headers.get('x-user-id') as string;

    switch (action) {
      case 'stats':
        const stats = await SocialService.getUserSocialStats(userId);
        return NextResponse.json({
          success: true,
          data: stats
        });

      case 'following':
        const followType = searchParams.get('type') as any;
        const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const offset = parseInt(searchParams.get('offset') || '0');
        
        const following = await SocialService.getFollowing(
          userId,
          followType,
          { limit, offset }
        );
        
        return NextResponse.json({
          success: true,
          data: following.following,
          meta: {
            total: following.total,
            limit,
            offset
          }
        });

      case 'followers':
        const followersLimit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const followersOffset = parseInt(searchParams.get('offset') || '0');
        
        const followers = await SocialService.getFollowers(
          userId,
          { limit: followersLimit, offset: followersOffset }
        );
        
        return NextResponse.json({
          success: true,
          data: followers.followers,
          meta: {
            total: followers.total,
            limit: followersLimit,
            offset: followersOffset
          }
        });

      case 'activities':
        const includeFollowing = searchParams.get('includeFollowing') !== 'false';
        const activitiesLimit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
        const activitiesOffset = parseInt(searchParams.get('offset') || '0');
        
        const activities = await SocialService.getActivityFeed(
          userId,
          { includeFollowing, limit: activitiesLimit, offset: activitiesOffset }
        );
        
        return NextResponse.json({
          success: true,
          data: activities.activities,
          meta: {
            total: activities.total,
            limit: activitiesLimit,
            offset: activitiesOffset
          }
        });

      case 'recommendations':
        const recommendedUsers = await SocialService.getRecommendedUsers(userId);
        return NextResponse.json({
          success: true,
          data: recommendedUsers
        });

      default:
        return NextResponse.json({
          success: false,
          error: { message: '不支持的操作' }
        }, { status: 400 });
    }
  } catch (error) {
    console.error('获取社交信息失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '获取社交信息失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, enableRateLimit: true });

// 社交操作
export const POST = withSecurity(async (request) => {
  try {
    const body = await request.json();
    const action = body.action;
    const userId = request.headers.get('x-user-id') as string;

    switch (action) {
      case 'follow':
        const followValidation = followSchema.safeParse(body);
        if (!followValidation.success) {
          return NextResponse.json({
            success: false,
            error: {
              message: '请求参数无效',
              details: followValidation.error.flatten()
            }
          }, { status: 400 });
        }

        const follow = await SocialService.follow(
          userId,
          followValidation.data.followingId,
          followValidation.data.followType
        );

        return NextResponse.json({
          success: true,
          data: follow,
          message: '关注成功'
        });

      case 'unfollow':
        const unfollowValidation = followSchema.safeParse(body);
        if (!unfollowValidation.success) {
          return NextResponse.json({
            success: false,
            error: {
              message: '请求参数无效',
              details: unfollowValidation.error.flatten()
            }
          }, { status: 400 });
        }

        const unfollowSuccess = await SocialService.unfollow(
          userId,
          unfollowValidation.data.followingId,
          unfollowValidation.data.followType
        );

        return NextResponse.json({
          success: unfollowSuccess,
          message: unfollowSuccess ? '取消关注成功' : '关注关系不存在'
        });

      case 'like':
        const likeValidation = likeSchema.safeParse(body);
        if (!likeValidation.success) {
          return NextResponse.json({
            success: false,
            error: {
              message: '请求参数无效',
              details: likeValidation.error.flatten()
            }
          }, { status: 400 });
        }

        const liked = await SocialService.likeAudio(
          userId,
          likeValidation.data.audioId
        );

        return NextResponse.json({
          success: true,
          data: { liked },
          message: liked ? '点赞成功' : '取消点赞成功'
        });

      case 'share':
        const shareValidation = shareSchema.safeParse(body);
        if (!shareValidation.success) {
          return NextResponse.json({
            success: false,
            error: {
              message: '请求参数无效',
              details: shareValidation.error.flatten()
            }
          }, { status: 400 });
        }

        const share = await SocialService.shareContent(
          userId,
          shareValidation.data.contentType,
          shareValidation.data.contentId,
          shareValidation.data.shareMethod,
          shareValidation.data.sharePlatform,
          shareValidation.data.shareData || {}
        );

        // 生成分享链接
        const shareLink = await SocialService.generateShareLink(shareValidation.data.contentType, shareValidation.data.contentId, userId);

        return NextResponse.json({
          success: true,
          data: {
            share,
            shareUrl: shareLink.shareUrl,
            qrCode: shareLink.qrCode
          },
          message: '分享成功'
        });

      default:
        return NextResponse.json({
          success: false,
          error: { message: '不支持的操作' }
        }, { status: 400 });
    }
  } catch (error) {
    console.error('社交操作失败:', error);
    return NextResponse.json({
      success: false,
      error: {
        message: '操作失败',
        details: error instanceof Error ? error.message : '未知错误'
      }
    }, { status: 500 });
  }
}, { requireAuth: true, requireCSRF: true, enableRateLimit: true, allowedMethods: ['POST'] });
