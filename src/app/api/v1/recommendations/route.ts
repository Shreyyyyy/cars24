import { NextRequest, NextResponse } from 'next/server';
import { recommendationsStore } from '@/lib/recommendations-store';

export const dynamic = 'force-dynamic';

export async function GET() {
  const items = recommendationsStore.getAll();
  return NextResponse.json({
    success: true,
    total: items.length,
    recommendations: items
  });
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, status, reviewerNotes, approvedBy } = body;

    if (!id || !status) {
      return NextResponse.json({ success: false, error: 'id and status are required' }, { status: 400 });
    }

    const updated = recommendationsStore.updateStatus(id, status, reviewerNotes, approvedBy);
    if (!updated) {
      return NextResponse.json({ success: false, error: 'Recommendation not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      recommendation: recommendationsStore.getById(id)
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const created = recommendationsStore.create(body);
    return NextResponse.json({
      success: true,
      recommendation: created
    }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 400 });
  }
}
