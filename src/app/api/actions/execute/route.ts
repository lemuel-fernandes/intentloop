import { NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({ actionId: z.string(), approved: z.boolean().default(false), actorId: z.string().optional() });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid action execution payload' }, { status: 400 });
  const action = await db.recommendedAction.findUnique({ where: { id: parsed.data.actionId } });
  if (!action) return NextResponse.json({ error: 'Action not found' }, { status: 404 });
  if (action.requiresApproval && !parsed.data.approved) { await db.recommendedAction.update({ where: { id: action.id }, data: { status: 'BLOCKED' } }); return NextResponse.json({ error: 'Human approval is required for this action.' }, { status: 403 }); }
  const updated = await db.recommendedAction.update({ where: { id: action.id }, data: { status: 'EXECUTED', approvedById: parsed.data.actorId, executedAt: new Date() } });
  await db.auditLog.create({ data: { actorType: 'USER', actorId: parsed.data.actorId, action: 'ACTION_EXECUTED', targetType: 'RECOMMENDED_ACTION', targetId: action.id, outputData: JSON.stringify({ actionType: action.actionType }), riskLevel: action.requiresApproval ? 'HIGH' : 'LOW' } });
  return NextResponse.json({ action: updated });
}
