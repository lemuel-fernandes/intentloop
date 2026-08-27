import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') ?? undefined;
  const stage = url.searchParams.get('stage') as any;
  const customers = await db.customer.findMany({ where: { ...(search ? { OR: [{ email: { contains: search } }, { firstName: { contains: search } }, { lastName: { contains: search } }] } : {}), ...(stage ? { lifecycleStage: stage } : {}) }, orderBy: { lastActivityAt: 'desc' }, take: 100, include: { intents: { orderBy: { createdAt: 'desc' }, take: 1 }, carts: { where: { status: 'OPEN' }, take: 1 } } });
  return NextResponse.json({ customers });
}
