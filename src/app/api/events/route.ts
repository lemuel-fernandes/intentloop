import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const eventSchema = z.object({ customerId: z.string().optional(), sessionId: z.string().optional(), eventType: z.string().min(1), eventData: z.record(z.string(), z.unknown()).default({}), source: z.string().default('api'), occurredAt: z.coerce.date().optional() });

export async function POST(request: Request) {
  const parsed = eventSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid event payload', details: parsed.error.flatten() }, { status: 400 });
  const event = await db.customerEvent.create({ data: { ...parsed.data, eventData: JSON.stringify(parsed.data.eventData), occurredAt: parsed.data.occurredAt ?? new Date() } });
  if (parsed.data.customerId) await db.customer.update({ where: { id: parsed.data.customerId }, data: { lastActivityAt: event.occurredAt } });
  return NextResponse.json({ id: event.id, received: true }, { status: 201 });
}
