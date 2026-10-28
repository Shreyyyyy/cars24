import { NextRequest, NextResponse } from 'next/server';
import { auditLogger } from '@/lib/audit-logger';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get('limit')) || 50;

  return NextResponse.json({
    success: true,
    logs: auditLogger.getLogs(limit)
  });
}
