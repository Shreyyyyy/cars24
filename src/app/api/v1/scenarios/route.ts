import { NextRequest, NextResponse } from 'next/server';
import { simulateMarketingScenarios, ScenarioParameters } from '@/lib/scenario-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const params: ScenarioParameters = {
      baselineUnits: Number(body.baselineUnits) || 186030,
      baselineASPInLakhs: Number(body.baselineASPInLakhs) || 8.65,
      baselineGrossTurnoverCr: Number(body.baselineGrossTurnoverCr) || 14242,
      baselineDiscountPerCarInr: Number(body.baselineDiscountPerCarInr) || 16500,
      baselineMarketingSpendCr: Number(body.baselineMarketingSpendCr) || 84.5,
      proposedMarketingSpendDeltaPct: Number(body.proposedMarketingSpendDeltaPct) || 12,
      proposedDiscountDeltaInr: Number(body.proposedDiscountDeltaInr) || -3000,
      channelIncentiveCr: Number(body.channelIncentiveCr) || 2.5
    };

    const simulation = simulateMarketingScenarios(params);
    return NextResponse.json({
      success: true,
      simulation
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
