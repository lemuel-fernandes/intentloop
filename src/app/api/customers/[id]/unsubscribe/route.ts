import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const customer = await db.customer.update({ where: { id }, data: { consentMarketing: false, consentEmail: false } }).catch(() => null);
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  await db.auditLog.create({ data: { actorType: 'CUSTOMER', action: 'UNSUBSCRIBED', targetType: 'CUSTOMER', targetId: id, riskLevel: 'LOW' } });
  return new NextResponse('You have been unsubscribed from IntentLoop emails.', { headers: { 'Content-Type': 'text/plain' } });
}
