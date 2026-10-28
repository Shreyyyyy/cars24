import { NextRequest } from 'next/server';
import { processSpreadsheetUpload } from '@/lib/upload-handler';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  return processSpreadsheetUpload(req);
}
