import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { db } from '@/lib/db';

export async function POST(request: Request) {
  if (!process.env.STRIPE_WEBHOOK_SECRET || !process.env.STRIPE_SECRET_KEY) return NextResponse.json({ error: 'Stripe webhook is not configured.' }, { status: 503 });
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing Stripe signature' }, { status: 400 });
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  let event: Stripe.Event;
  try { event = stripe.webhooks.constructEvent(await request.text(), signature, process.env.STRIPE_WEBHOOK_SECRET); } catch { return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 }); }
  const session = event.data.object as Stripe.Checkout.Session;
  const paymentLinkId = typeof session.payment_link === 'string' ? session.payment_link : session.payment_link?.id;
  const cart = event.type === 'checkout.session.completed' && paymentLinkId ? await db.cart.findFirst({ where: { stripePaymentLinkId: paymentLinkId } }) : null;
  if (cart) await db.cart.update({ where: { id: cart.id }, data: { status: 'RECOVERED', recoveredAt: new Date() } });
  await db.auditLog.create({ data: { actorType: 'STRIPE', action: `WEBHOOK_${event.type}`, targetType: 'CART', targetId: cart?.id, outputData: JSON.stringify({ eventId: event.id }), riskLevel: 'MEDIUM' } });
  return NextResponse.json({ received: true });
}
