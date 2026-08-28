import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() { return NextResponse.json({ logs: await db.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 200 }) }); }
