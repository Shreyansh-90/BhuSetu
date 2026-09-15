import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sql } from 'drizzle-orm';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const startTime = performance.now();
  
  const status = {
    uptime: process.uptime(),
    timestamp: new Date().toISOString(),
    services: {
      database: 'unknown',
      auth: 'unknown',
    },
    latencyMs: 0,
    memoryUsage: process.memoryUsage(),
  };

  try {
    // 1. Check Database (Drizzle ORM)
    await db.execute(sql`SELECT 1`);
    status.services.database = 'healthy';
  } catch (err) {
    status.services.database = 'unhealthy';
  }

  try {
    // 2. Check Supabase Auth
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    if (!error) {
      status.services.auth = 'healthy';
    } else {
      status.services.auth = 'unhealthy';
    }
  } catch (err) {
    status.services.auth = 'unhealthy';
  }

  status.latencyMs = Math.round(performance.now() - startTime);

  const isHealthy = Object.values(status.services).every((s) => s === 'healthy');

  return NextResponse.json(status, {
    status: isHealthy ? 200 : 503,
    headers: {
      'Cache-Control': 'no-store, max-age=0',
    },
  });
}