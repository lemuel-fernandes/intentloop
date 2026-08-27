import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { sendEmail, unsubscribeUrl } from '@/lib/email';

const schema = z.object({ customerId: z.string(), subject: z.string().min(1), body: z.string().min(1), marketing: z.boolean().default(false) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email payload', details: parsed.error.flatten() }, { status: 400 });
  const customer = await db.customer.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email)) return NextResponse.json({ error: 'Customer email is invalid.' }, { status: 422 });
  if (parsed.data.marketing && !customer.consentMarketing) return NextResponse.json({ error: 'Marketing consent is required.' }, { status: 403 });
  if (!customer.consentEmail) return NextResponse.json({ error: 'Email consent is required.' }, { status: 403 });
  const since = new Date(Date.now() - 86400000);
  if (await db.message.count({ where: { customerId: customer.id, createdAt: { gte: since } } }) >= 3) return NextResponse.json({ error: 'Daily customer sending limit reached.' }, { status: 429 });
  const body = parsed.data.marketing ? `${parsed.data.body}<p><a href="${unsubscribeUrl(customer.id)}">Unsubscribe</a></p>` : parsed.data.body;
  const message = await db.message.create({ data: { customerId: customer.id, channel: 'EMAIL', subject: parsed.data.subject, body, status: 'QUEUED' } });
  try { const providerMessageId = await sendEmail({ to: customer.email, subject: parsed.data.subject, html: body }); const sent = await db.message.update({ where: { id: message.id }, data: { providerMessageId, status: 'SENT', sentAt: new Date() } }); await db.auditLog.create({ data: { actorType: 'USER', action: 'EMAIL_SENT', targetType: 'MESSAGE', targetId: message.id, outputData: JSON.stringify({ providerMessageId }), riskLevel: 'MEDIUM' } }); return NextResponse.json({ message: sent }, { status: 201 }); }
  catch (error) { const failed = await db.message.update({ where: { id: message.id }, data: { status: 'FAILED', failureReason: error instanceof Error ? error.message : 'Provider error' } }); return NextResponse.json({ error: failed.failureReason, message: failed }, { status: 502 }); }
}
