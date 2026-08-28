import { NextResponse } from 'next/server';
import { z } from 'zod';
import { csvRows } from '@/lib/imports';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const rows = csvRows(await request.text()); let imported = 0;
    for (const row of rows) {
      const value = z.object({ externalId: z.string().min(1), customerEmail: z.string().email(), status: z.string().min(1), totalAmount: z.coerce.number().nonnegative(), currency: z.string().default('USD'), source: z.string().optional() }).parse(row);
      const customer = await db.customer.findUnique({ where: { email: value.customerEmail } });
      if (!customer) throw new Error(`Customer not found for ${value.customerEmail}`);
      await db.order.upsert({ where: { externalId: value.externalId }, create: { externalId: value.externalId, customerId: customer.id, status: value.status, totalAmount: value.totalAmount, currency: value.currency, source: value.source }, update: { status: value.status, totalAmount: value.totalAmount, currency: value.currency, source: value.source } }); imported++;
    }
    return NextResponse.json({ imported }, { status: 201 });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Order import failed.' }, { status: 422 }); }
}
