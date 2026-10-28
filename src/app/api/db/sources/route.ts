import { NextRequest, NextResponse } from 'next/server';
import { getClientConnector } from '@/lib/connectors';
import { ingestTabularBuffer, IngestError } from '@/lib/upload-handler';
import { getDatasetMetadata } from '@/lib/sqlite-server';

export const dynamic = 'force-dynamic';

/** Datasets available in the client's store, and which one is active. */
export async function GET() {
  try {
    const connector = getClientConnector();
    const datasets = await connector.listDatasets();
    const meta = getDatasetMetadata();
    return NextResponse.json({
      connector: { id: connector.id, label: connector.label, location: connector.location },
      datasets,
      activeId: meta?.source?.startsWith(`${connector.id}:`) ? meta.sourceId : null
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message, datasets: [] }, { status: 500 });
  }
}

/** Loads one dataset from the client's store as the active dataset. Body: { id } */
export async function POST(req: NextRequest) {
  try {
    const { id } = await req.json();
    if (!id || typeof id !== 'string') return NextResponse.json({ error: 'Missing dataset id' }, { status: 400 });
    const connector = getClientConnector();
    const { fileName, buffer } = await connector.fetchDataset(id);
    const result = await ingestTabularBuffer(fileName, buffer, { source: `${connector.id}:${connector.location}`, sourceId: id });
    return NextResponse.json({ ...result, sourceId: id });
  } catch (err: any) {
    const status = err instanceof IngestError ? err.status : /not found/i.test(err.message) ? 404 : 500;
    return NextResponse.json({ error: err.message }, { status });
  }
}
