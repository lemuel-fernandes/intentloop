import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { classifyFailure } from '@/lib/analysis';

export async function POST(_: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  const cart = await db.cart.findUnique({ where: { id }, include: { payments: true, customer: { include: { events: { orderBy: { occurredAt: 'desc' }, take: 50 } } } } });
  if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
  const result = classifyFailure(cart.customer?.events ?? [], cart.payments, cart);
  const analysis = await db.saleFailureAnalysis.create({ data: { customerId: cart.customerId, cartId: id, primaryReason: result.primaryReason, secondaryReasons: JSON.stringify(result.secondaryReasons), confidence: result.confidence, evidence: JSON.stringify(result.evidence), reasonType: result.reasonType } });
  await db.auditLog.create({ data: { actorType: 'SYSTEM', action: 'SALE_FAILURE_ANALYZED', targetType: 'CART', targetId: id, inputData: JSON.stringify({ paymentCount: cart.payments.length }), outputData: JSON.stringify(result), riskLevel: 'LOW' } });
  return NextResponse.json({ analysis, result }, { status: 201 });
}
