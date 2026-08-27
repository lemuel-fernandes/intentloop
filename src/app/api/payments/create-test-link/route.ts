import { NextResponse } from 'next/server';
import { z } from 'zod';
import Stripe from 'stripe';
import { db } from '@/lib/db';

const schema = z.object({ cartId: z.string() });
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'cartId is required' }, { status: 400 });
  if (!process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe is not configured. Add STRIPE_SECRET_KEY for test-mode links.' }, { status: 503 });
  const cart = await db.cart.findUnique({ where: { id: parsed.data.cartId }, include: { items: { include: { product: true } } } });
  if (!cart) return NextResponse.json({ error: 'Cart not found' }, { status: 404 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  try {
    const link = await stripe.paymentLinks.create({ line_items: cart.items.map((item) => ({ quantity: item.quantity, price_data: { currency: cart.currency.toLowerCase(), unit_amount: Math.round(item.unitPrice * 100), product_data: { name: item.product.name } } })) });
    const updated = await db.cart.update({ where: { id: cart.id }, data: { stripePaymentLinkId: link.id, stripePaymentLinkUrl: link.url } });
    await db.auditLog.create({ data: { actorType: 'USER', action: 'STRIPE_TEST_LINK_CREATED', targetType: 'CART', targetId: cart.id, outputData: JSON.stringify({ linkId: link.id }), riskLevel: 'HIGH' } });
    return NextResponse.json({ testMode: true, cart: updated, url: link.url });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : 'Stripe provider error' }, { status: 502 }); }
}
