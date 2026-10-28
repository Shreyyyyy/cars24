import { NextResponse } from 'next/server';
import { analyzeGrowthOpportunities } from '@/lib/growth-opportunities';
import { getDatasetMetadata } from '@/lib/sqlite-server';
import { suggestQuestionsForDataset } from '@/lib/dataset-context';

export const dynamic = 'force-dynamic';

/** Growth opportunities computed from the uploaded file only. */
export async function GET() {
  try {
    const meta = getDatasetMetadata();
    if (!meta) {
      return NextResponse.json({ success: true, loaded: false, message: 'Upload a file to see growth opportunities.' });
    }
    const analysis = analyzeGrowthOpportunities();
    return NextResponse.json({
      success: true,
      loaded: true,
      analysis,
      suggestedQuestions: suggestQuestionsForDataset(meta)
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Growth analysis failed' }, { status: 500 });
  }
}
