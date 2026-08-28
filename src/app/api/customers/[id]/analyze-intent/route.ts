import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { classifyIntentWithProvider } from '@/lib/analysis';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const customer = await db.customer.findUnique({ where: { id }, include: { events: { orderBy: { occurredAt: 'desc' }, take: 50 }, carts: { where: { status: 'OPEN' }, take: 1 } } });
  if (!customer) return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
  const result = await classifyIntentWithProvider(customer.events, customer.carts[0]);
  const analysis = await db.intentAnalysis.create({ data: { customerId: id, intentType: result.intent, confidence: result.confidence, evidence: JSON.stringify(result.evidence), model: result.model } });
  await db.auditLog.create({ data: { actorType: 'SYSTEM', action: 'INTENT_ANALYZED', targetType: 'CUSTOMER', targetId: id, inputData: JSON.stringify({ eventCount: customer.events.length }), outputData: JSON.stringify(result), riskLevel: 'LOW' } });
  return NextResponse.json({ analysis, result }, { status: 201 });
}
