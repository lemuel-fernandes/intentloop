import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const customer = await db.customer.findUnique({ where: { id }, include: { events: { orderBy: { occurredAt: 'desc' }, take: 50 }, carts: { orderBy: { createdAt: 'desc' }, include: { items: { include: { product: true } }, payments: true } }, orders: { orderBy: { createdAt: 'desc' }, include: { payments: true } }, intents: { orderBy: { createdAt: 'desc' } }, failures: { orderBy: { createdAt: 'desc' } }, messages: { orderBy: { createdAt: 'desc' } }, tickets: { orderBy: { createdAt: 'desc' } } } });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  return NextResponse.json({ customer });
}
