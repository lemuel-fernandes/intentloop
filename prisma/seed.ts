import { PrismaClient, UserRole, LifecycleStage, IntentType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const db = new PrismaClient();

async function main() {
  await db.$transaction([
    db.auditLog.deleteMany(), db.recommendedAction.deleteMany(), db.intentAnalysis.deleteMany(),
    db.saleFailureAnalysis.deleteMany(), db.paymentAttempt.deleteMany(), db.cartItem.deleteMany(),
    db.cart.deleteMany(), db.order.deleteMany(), db.customerEvent.deleteMany(), db.message.deleteMany(),
    db.supportTicket.deleteMany(), db.customer.deleteMany(), db.product.deleteMany(),
    db.knowledgeChunk.deleteMany(), db.knowledgeDocument.deleteMany(), db.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash('demo-password', 10);
  await db.user.create({ data: { name: 'Demo Admin', email: 'admin@intentloop.local', passwordHash, role: UserRole.ADMIN } });
  const products = await Promise.all([
    db.product.create({ data: { externalId: 'demo-aurora', name: 'Aurora Desk Lamp', description: 'Adjustable task light with warm and cool modes.', category: 'Lighting', price: 129, stockStatus: 'IN_STOCK' } }),
    db.product.create({ data: { externalId: 'demo-field', name: 'Field Notes Set', description: 'Three durable notebooks for focused work.', category: 'Stationery', price: 36, stockStatus: 'LOW_STOCK' } }),
  ]);
  const maya = await db.customer.create({ data: { externalId: 'demo-maya', firstName: 'Maya', lastName: 'Chen', email: 'maya@example.test', consentEmail: true, consentMarketing: true, lifecycleStage: LifecycleStage.CONSIDERATION, acquisitionSource: 'organic', lastActivityAt: new Date() } });
  const theo = await db.customer.create({ data: { externalId: 'demo-theo', firstName: 'Theo', lastName: 'Grant', email: 'theo@example.test', consentEmail: true, consentMarketing: false, lifecycleStage: LifecycleStage.CHECKOUT, acquisitionSource: 'newsletter', lastActivityAt: new Date(Date.now() - 86400000) } });
  await db.customer.create({ data: { externalId: 'demo-nia', firstName: 'Nia', lastName: 'Okafor', email: 'nia@example.test', consentEmail: false, consentMarketing: false, lifecycleStage: LifecycleStage.LEAD, acquisitionSource: 'referral' } });
  const cart = await db.cart.create({ data: { customerId: theo.id, sessionId: 'demo-session-theo', status: 'ABANDONED', totalAmount: 129, abandonedAt: new Date(Date.now() - 3600000), items: { create: [{ productId: products[0].id, quantity: 1, unitPrice: 129 }] } } });
  await db.paymentAttempt.create({ data: { cartId: cart.id, provider: 'stripe_test', status: 'FAILED', failureCode: 'card_declined', failureMessage: 'The test card was declined.', amount: 129 } });
  await db.customerEvent.createMany({ data: [
    { customerId: maya.id, sessionId: 'demo-session-maya', eventType: 'product_viewed', eventData: JSON.stringify({ product: products[0].name }), source: 'demo' },
    { customerId: maya.id, sessionId: 'demo-session-maya', eventType: 'message_received', eventData: JSON.stringify({ text: 'Does this work for a small desk?' }), source: 'demo' },
    { customerId: theo.id, sessionId: 'demo-session-theo', eventType: 'checkout_started', eventData: JSON.stringify({ total: 129 }), source: 'demo' },
  ] });
  await db.intentAnalysis.create({ data: { customerId: maya.id, intentType: IntentType.PRODUCT_FIT_CONCERN, confidence: 0.88, evidence: JSON.stringify(['Customer asked whether the lamp fits a small desk.', 'Customer viewed Aurora Desk Lamp.']), model: 'demo-deterministic-v1' } });
  await db.saleFailureAnalysis.create({ data: { customerId: theo.id, cartId: cart.id, primaryReason: 'PAYMENT_DECLINED', confidence: 0.99, reasonType: 'CONFIRMED', evidence: JSON.stringify([{ source: 'payment_provider', text: 'The test card was declined.' }]) } });
  await db.knowledgeDocument.create({ data: { title: 'Demo Delivery Policy', documentType: 'DELIVERY_POLICY', source: 'demo seed', checksum: 'demo-delivery-v1', content: 'Standard delivery takes 3 to 5 business days. Express delivery is available at checkout.' } });
  console.log('Seeded synthetic IntentLoop demo data.');
}

main().finally(() => db.$disconnect());
