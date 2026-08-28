import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() { return NextResponse.json({ actions: await db.recommendedAction.findMany({ where: { status: { in: ['PENDING', 'APPROVAL'] } }, orderBy: { createdAt: 'desc' }, include: { customer: true } }) }); }
