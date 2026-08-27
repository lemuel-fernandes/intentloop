import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({ query: z.string().min(2), limit: z.number().int().min(1).max(20).default(5) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'A search query is required' }, { status: 400 });
  const terms = parsed.data.query.toLowerCase().split(/\s+/).filter(Boolean);
  const chunks = await db.knowledgeChunk.findMany({ include: { document: true }, take: 100 });
  const scored = chunks.map((chunk) => ({ chunk, score: terms.reduce((score, term) => score + (chunk.content.toLowerCase().includes(term) || chunk.document.title.toLowerCase().includes(term) ? 1 : 0), 0) })).filter((item) => item.score > 0).sort((a, b) => b.score - a.score).slice(0, parsed.data.limit).map(({ chunk, score }) => ({ score, documentTitle: chunk.document.title, source: chunk.document.source, matchedText: chunk.content }));
  return NextResponse.json({ results: scored });
}
