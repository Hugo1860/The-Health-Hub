import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth, UnifiedResponseBuilder, AuthContext } from '@/lib/unified-auth-middleware';

async function handleGet(request: NextRequest, context: AuthContext) {
  try {
    console.log(`[${context.requestId}] Test admin API called`);
    console.log(`[${context.requestId}] Request headers:`, Object.fromEntries(request.headers.entries()));
    
    return UnifiedResponseBuilder.success({
      authenticated: true,
      user: {
        id: context.user!.id,
        email: context.user!.email,
        name: context.user!.name,
        role: context.user!.role,
        status: context.user!.status
      },
      isAdmin: context.isAdmin,
      debug: {
        hasSession: true,
        userKeys: Object.keys(context.user || {}),
        roleCheck: {
          userRole: context.user?.role,
          validRoles: ['admin', 'moderator', 'editor'],
          includes: ['admin', 'moderator', 'editor'].includes(context.user?.role || '')
        }
      }
    });
    
  } catch (error) {
    console.error(`[${context.requestId}] Test admin API error:`, error);
    return UnifiedResponseBuilder.serverError(
      error instanceof Error ? error.message : 'Unknown error'
    );
  }
}

export const GET = withAdminAuth(handleGet);