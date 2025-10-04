import { NextRequest, NextResponse } from 'next/server';
import { getDatabase } from '@/lib/database';
import { withSecurity } from '@/lib/secureApiWrapper';

// 健康检查：应用与数据库
export const dynamic = 'force-dynamic';

async function handler(_req: NextRequest) {
  const startedAt = Date.now();
  const db = getDatabase();

  let dbOk = false;
  let dbLatencyMs: number | undefined;
  try {
    const t0 = Date.now();
    // 使用最轻的查询
    await db.query('SELECT 1');
    dbLatencyMs = Date.now() - t0;
    dbOk = true;
  } catch (e: any) {
    dbOk = false;
  }

  const body = {
    status: dbOk ? 'ok' : 'degraded',
    uptimeMs: process.uptime() * 1000,
    startedAt,
    checks: {
      app: { ok: true },
      db: { ok: dbOk, latencyMs: dbLatencyMs }
    }
  };

  const status = dbOk ? 200 : 503;
  return NextResponse.json(body, { status });
}

export const GET = withSecurity(handler, {
  requireAuth: false,
  enableRateLimit: true,
  rateLimitMax: 60,
  rateLimitWindow: 60000,
  allowedMethods: ['GET']
});