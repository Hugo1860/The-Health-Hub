import { NextResponse } from 'next/server';
import { apiMiddleware } from '@/lib/api-middleware';
import { performSystemHealthCheck } from '@/lib/health-checker';

export const GET = apiMiddleware.public(async (_req, context) => {
  const health = await performSystemHealthCheck();
  const httpStatus = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;

  return NextResponse.json(
    {
      success: true,
      data: health,
      meta: {
        requestId: context.requestId,
        timestamp: new Date().toISOString(),
        version: process.env.API_VERSION || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
      },
    },
    { status: httpStatus }
  );
});