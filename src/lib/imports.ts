import { parse } from 'csv-parse/sync';
import { z } from 'zod';
import { db } from './db';

const row = z.record(z.string(), z.string());
export function csvRows(csv: string) { const rows = parse(csv, { columns: true, skip_empty_lines: true, bom: true, trim: true }); return z.array(row).parse(rows); }

export async function importCustomers(csv: string) {
  const rows = csvRows(csv); let imported = 0;
  for (const item of rows) { const value = z.object({ email: z.string().email(), firstName: z.string().optional(), lastName: z.string().optional(), phone: z.string().optional(), externalId: z.string().optional(), acquisitionSource: z.string().optional(), consentEmail: z.string().optional(), consentMarketing: z.string().optional() }).parse(item); await db.customer.upsert({ where: { email: value.email }, create: { ...value, consentEmail: value.consentEmail === 'true', consentMarketing: value.consentMarketing === 'true' }, update: { ...value, consentEmail: value.consentEmail === 'true', consentMarketing: value.consentMarketing === 'true' } }); imported++; }
  return imported;
}

export async function importProducts(csv: string) {
  const rows = csvRows(csv); let imported = 0;
  for (const item of rows) { const value = z.object({ name: z.string().min(1), description: z.string().default(''), price: z.coerce.number().nonnegative(), currency: z.string().default('USD'), externalId: z.string().optional(), category: z.string().optional(), stockStatus: z.string().default('IN_STOCK') }).parse(item); if (value.externalId) await db.product.upsert({ where: { externalId: value.externalId }, create: value, update: value }); else await db.product.create({ data: value }); imported++; }
  return imported;
}
