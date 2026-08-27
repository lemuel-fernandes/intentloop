import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    const [customers, leads, highIntent, activeCarts, abandonedCarts, failedPayments, recoveredCarts, emailsSent, emailFailures, approvals, tickets] = await Promise.all([
      db.customer.count(), db.customer.count({ where: { lifecycleStage: 'LEAD' } }), db.intentAnalysis.count({ where: { intentType: 'PURCHASE_READY' } }),
      db.cart.count({ where: { status: 'OPEN' } }), db.cart.count({ where: { status: 'ABANDONED' } }), db.paymentAttempt.count({ where: { status: 'FAILED' } }),
      db.cart.count({ where: { recoveredAt: { not: null } } }), db.message.count({ where: { status: 'SENT' } }), db.message.count({ where: { status: 'FAILED' } }),
      db.recommendedAction.count({ where: { status: { in: ['PENDING', 'APPROVAL'] } } }), db.supportTicket.count({ where: { status: 'OPEN' } }),
    ]);
    return NextResponse.json({ customers, leads, highIntent, activeCarts, abandonedCarts, failedPayments, recoveredCarts, emailsSent, emailFailures, approvals, tickets });
  } catch { return NextResponse.json({ error: 'Database unavailable. Run npm run db:push.' }, { status: 503 }); }
}
