import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({ customerId: z.string(), subject: z.string().min(2), description: z.string().min(2), priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).default('NORMAL') });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid support ticket.', details: parsed.error.flatten() }, { status: 400 });
  const customer = await db.customer.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer) return NextResponse.json({ error: 'Customer not found.' }, { status: 404 });
  const ticket = await db.supportTicket.create({ data: parsed.data });
  await db.auditLog.create({ data: { actorType: 'USER', action: 'SUPPORT_TICKET_CREATED', targetType: 'SUPPORT_TICKET', targetId: ticket.id, inputData: JSON.stringify(parsed.data), riskLevel: 'LOW' } });
  return NextResponse.json({ ticket }, { status: 201 });
}

export async function GET() { return NextResponse.json({ tickets: await db.supportTicket.findMany({ orderBy: { createdAt: 'desc' }, include: { customer: true } }) }); }
