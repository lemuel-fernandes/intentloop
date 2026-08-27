import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';
import { unsubscribeUrl } from '@/lib/email';

const schema = z.object({ customerId: z.string(), subject: z.string().min(1), body: z.string().min(1), marketing: z.boolean().default(false) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid email preview payload', details: parsed.error.flatten() }, { status: 400 });
  const customer = await db.customer.findUnique({ where: { id: parsed.data.customerId } });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  return NextResponse.json({ preview: { to: customer.email, subject: parsed.data.subject, body: parsed.data.body, unsubscribeUrl: parsed.data.marketing ? unsubscribeUrl(customer.id) : null }, sendable: Boolean(process.env.RESEND_API_KEY || process.env.SMTP_HOST), warning: process.env.RESEND_API_KEY || process.env.SMTP_HOST ? null : 'Email integration not configured.' });
}
