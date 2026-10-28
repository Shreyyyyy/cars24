import { NextRequest, NextResponse } from 'next/server';
import { mappingContext, mappingErrorResponse, readJson } from '@/lib/schema-dictionary/api';
import { parseMappingDoc } from '@/lib/schema-dictionary/model';
import { buildSchemaKnowledge } from '@/lib/schema-knowledge';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * What the Text-to-SQL agent receives for a mapping (a draft, or the active one): its system
 * instructions, the definitions repeated with every question, and the tables it would profile for a
 * sample question. Body: { doc?, question? }
 */
export async function POST(req: NextRequest) {
  try {
    const ctx = mappingContext();
    if (ctx instanceof NextResponse) return ctx;
    const body = await readJson(req).catch(() => ({}));
    const doc = body?.doc !== undefined ? parseMappingDoc(body.doc).doc : ctx.active.doc;
    const knowledge = buildSchemaKnowledge(ctx.meta, doc, body?.doc !== undefined ? 'draft' : ctx.active.ref);
    if (!knowledge) {
      return NextResponse.json({ success: true, applies: false, message: 'No sheet of this mapping matches the loaded data, so Text-to-SQL uses the generic schema description.' });
    }
    const question = typeof body?.question === 'string' && body.question.trim() ? body.question.slice(0, 500) : '';
    return NextResponse.json({
      success: true,
      applies: true,
      systemPrompt: knowledge.systemPrompt,
      canonicalDefinitions: knowledge.canonicalDefinitions,
      relevantTables: question ? knowledge.relevantTables(question) : undefined,
      approxTokens: Math.round(knowledge.systemPrompt.length / 4)
    });
  } catch (err) {
    return mappingErrorResponse(err);
  }
}
