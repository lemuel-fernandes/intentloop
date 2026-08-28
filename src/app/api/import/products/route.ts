import { NextResponse } from 'next/server';
import { importProducts } from '@/lib/imports';

export async function POST(request: Request) {
  const csv = await request.text();
  if (!csv.trim()) return NextResponse.json({ error: 'CSV body is required.' }, { status: 400 });
  try { return NextResponse.json({ imported: await importProducts(csv) }, { status: 201 }); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Product import failed.' }, { status: 422 }); }
}
