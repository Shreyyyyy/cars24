import { NextRequest, NextResponse } from 'next/server';
import { generateTimeSeriesForecast } from '@/lib/forecasting-engine';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    // Forecasts are only ever made from real history supplied by the caller (never a built-in sample series)
    if (!Array.isArray(body.historicalData) || body.historicalData.length === 0) {
      return NextResponse.json({ success: false, error: 'historicalData is required: [{ period, value }, ...] from your uploaded data.' }, { status: 400 });
    }
    const data = body.historicalData;
    const horizonMonths = Number(body.horizonMonths) || 3;
    const alpha = Number(body.alpha) || 0.4;
    const beta = Number(body.beta) || 0.2;

    const forecast = generateTimeSeriesForecast(data, horizonMonths, alpha, beta);
    return NextResponse.json({
      success: true,
      forecast
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
