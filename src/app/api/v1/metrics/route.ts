import { NextRequest, NextResponse } from 'next/server';
import { SEMANTIC_METRICS_CATALOG, buildGovernedQuery } from '@/lib/semantic-catalog';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    success: true,
    catalogVersion: 'v2.4',
    totalMetrics: Object.keys(SEMANTIC_METRICS_CATALOG).length,
    metrics: Object.values(SEMANTIC_METRICS_CATALOG)
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { metricId, dimension, filterState, filterChannel, limit, orderDirection } = body;

    const result = buildGovernedQuery({
      metricId,
      dimension: dimension || 'assigned_dealer',
      filterState,
      filterChannel,
      limit,
      orderDirection
    });

    return NextResponse.json({
      success: true,
      governedQuery: result
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
