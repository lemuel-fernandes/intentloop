import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({ customerId: z.string().optional(), cartId: z.string().optional(), actionType: z.enum(['ANSWER_QUESTION', 'RECOMMEND_PRODUCT', 'REQUEST_MORE_INFORMATION', 'SEND_FOLLOWUP_EMAIL', 'SEND_PAYMENT_REMINDER', 'CREATE_PAYMENT_LINK', 'OFFER_APPROVED_DISCOUNT', 'CREATE_SUPPORT_TICKET', 'ESCALATE_TO_HUMAN', 'DO_NOT_CONTACT']), reason: z.string().min(1), confidence: z.number().min(0).max(1).default(0.5) });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action recommendation', details: parsed.error.flatten() }, { status: 400 });
  if (!parsed.data.customerId && !parsed.data.cartId) return NextResponse.json({ error: 'customerId or cartId is required' }, { status: 400 });
  const requiresApproval = ['CREATE_PAYMENT_LINK', 'OFFER_APPROVED_DISCOUNT', 'ESCALATE_TO_HUMAN'].includes(parsed.data.actionType);
  const action = await db.recommendedAction.create({ data: { ...parsed.data, status: requiresApproval ? 'APPROVAL' : 'PENDING', requiresApproval } });
  await db.auditLog.create({ data: { actorType: 'USER', action: 'ACTION_RECOMMENDED', targetType: 'RECOMMENDED_ACTION', targetId: action.id, inputData: JSON.stringify(parsed.data), outputData: JSON.stringify({ requiresApproval }), riskLevel: requiresApproval ? 'HIGH' : 'LOW' } });
  return NextResponse.json({ action }, { status: 201 });
}
