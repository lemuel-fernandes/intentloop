import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createHash } from 'node:crypto';
import { db } from '@/lib/db';

const schema = z.object({ title: z.string().min(1), documentType: z.string().min(1), content: z.string().min(20), source: z.string().min(1) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid knowledge document', details: parsed.error.flatten() }, { status: 400 });
  const checksum = createHash('sha256').update(parsed.data.content).digest('hex');
  const chunks = parsed.data.content.split(/\n\s*\n/).map((content) => content.trim()).filter(Boolean);
  const document = await db.knowledgeDocument.create({ data: { ...parsed.data, checksum, chunks: { create: chunks.map((content) => ({ content })) } }, include: { chunks: true } });
  return NextResponse.json({ document }, { status: 201 });
}

export async function GET() { return NextResponse.json({ documents: await db.knowledgeDocument.findMany({ orderBy: { updatedAt: 'desc' }, include: { chunks: true } }) }); }
