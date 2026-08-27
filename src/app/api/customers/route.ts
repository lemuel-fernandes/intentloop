import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { LifecycleStage } from '@prisma/client';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const search = url.searchParams.get('search') ?? undefined;
  const stageValue = url.searchParams.get('stage');
  const stage = stageValue && Object.values(LifecycleStage).includes(stageValue as LifecycleStage) ? stageValue as LifecycleStage : undefined;
  const customers = await db.customer.findMany({ where: { ...(search ? { OR: [{ email: { contains: search } }, { firstName: { contains: search } }, { lastName: { contains: search } }] } : {}), ...(stage ? { lifecycleStage: stage } : {}) }, orderBy: { lastActivityAt: 'desc' }, take: 100, include: { intents: { orderBy: { createdAt: 'desc' }, take: 1 }, carts: { where: { status: 'OPEN' }, take: 1 } } });
  return NextResponse.json({ customers });
}
