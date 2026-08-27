import { z } from 'zod';
import type { Customer, CustomerEvent, Cart, PaymentAttempt } from '@prisma/client';

export const intentResultSchema = z.object({
  intent: z.enum(['DISCOVERY', 'PRODUCT_RESEARCH', 'PRODUCT_COMPARISON', 'PURCHASE_READY', 'PRICE_CONCERN', 'TRUST_CONCERN', 'DELIVERY_CONCERN', 'PRODUCT_FIT_CONCERN', 'STOCK_CONCERN', 'PAYMENT_PROBLEM', 'REFUND_OR_RETURN', 'SUPPORT_REQUEST', 'POST_PURCHASE', 'REENGAGEMENT', 'UNSUBSCRIBE', 'UNKNOWN']),
  confidence: z.number().min(0).max(1), evidence: z.array(z.string()), recommendedNextAction: z.string(), needsHumanReview: z.boolean(), model: z.string(),
});
export type IntentResult = z.infer<typeof intentResultSchema>;

export const failureResultSchema = z.object({
  primaryReason: z.string(), secondaryReasons: z.array(z.string()), confidence: z.number().min(0).max(1), evidence: z.array(z.object({ source: z.string(), text: z.string() })), reasonType: z.enum(['CONFIRMED', 'INFERRED', 'UNKNOWN']), recommendedAction: z.string(),
});
export type FailureResult = z.infer<typeof failureResultSchema>;

function eventText(events: CustomerEvent[]) { return events.map((event) => `${event.eventType} ${event.eventData}`).join(' ').toLowerCase(); }

export function classifyIntent(events: CustomerEvent[], cart?: Cart | null): IntentResult {
  const text = eventText(events);
  let intent: IntentResult['intent'] = 'UNKNOWN'; let confidence = 0.45; let action = 'REQUEST_MORE_INFORMATION';
  if (/unsubscribe|stop emailing|remove me/.test(text)) { intent = 'UNSUBSCRIBE'; confidence = 0.99; action = 'DO_NOT_CONTACT'; }
  else if (/declined|payment|card|authentication/.test(text)) { intent = 'PAYMENT_PROBLEM'; confidence = 0.9; action = 'ANSWER_QUESTION'; }
  else if (/delivery|arrive|shipping|tomorrow/.test(text)) { intent = 'DELIVERY_CONCERN'; confidence = 0.84; action = 'ANSWER_QUESTION'; }
  else if (/price|expensive|discount|cost/.test(text)) { intent = 'PRICE_CONCERN'; confidence = 0.82; action = 'ANSWER_QUESTION'; }
  else if (/compare|versus| or /.test(text)) { intent = 'PRODUCT_COMPARISON'; confidence = 0.8; action = 'RECOMMEND_PRODUCT'; }
  else if (/small desk|fit|size|compatible/.test(text)) { intent = 'PRODUCT_FIT_CONCERN'; confidence = 0.88; action = 'ANSWER_QUESTION'; }
  else if (cart?.status === 'OPEN' || /checkout|buy|purchase/.test(text)) { intent = 'PURCHASE_READY'; confidence = 0.78; action = 'SEND_PAYMENT_REMINDER'; }
  else if (/view|browse|looking|learn/.test(text)) { intent = 'PRODUCT_RESEARCH'; confidence = 0.7; action = 'RECOMMEND_PRODUCT'; }
  const evidence = events.slice(0, 3).map((event) => `${event.eventType}: ${event.eventData}`);
  if (confidence < 0.65) { intent = 'UNKNOWN'; action = 'REQUEST_MORE_INFORMATION'; }
  return intentResultSchema.parse({ intent, confidence, evidence, recommendedNextAction: action, needsHumanReview: intent === 'UNKNOWN', model: 'deterministic-signals-v1' });
}

export function classifyFailure(events: CustomerEvent[], payments: PaymentAttempt[], cart?: Cart | null): FailureResult {
  const text = `${eventText(events)} ${payments.map((payment) => `${payment.failureCode} ${payment.failureMessage}`).join(' ')}`.toLowerCase();
  if (payments.some((payment) => payment.status === 'FAILED')) return failureResultSchema.parse({ primaryReason: 'PAYMENT_DECLINED', secondaryReasons: [], confidence: 0.99, evidence: [{ source: 'payment_provider', text: payments.find((payment) => payment.status === 'FAILED')?.failureMessage ?? 'Payment provider reported failure.' }], reasonType: 'CONFIRMED', recommendedAction: 'SEND_PAYMENT_REMINDER' });
  if (/shipping|delivery fee|delivery charge/.test(text)) return failureResultSchema.parse({ primaryReason: 'SHIPPING_COST', secondaryReasons: [], confidence: 0.82, evidence: [{ source: 'customer_event', text: 'Checkout evidence mentions shipping cost.' }], reasonType: 'INFERRED', recommendedAction: 'ANSWER_QUESTION' });
  if (/price|expensive|discount/.test(text)) return failureResultSchema.parse({ primaryReason: 'PRICE_TOO_HIGH', secondaryReasons: [], confidence: 0.8, evidence: [{ source: 'customer_event', text: 'Customer evidence mentions price.' }], reasonType: 'INFERRED', recommendedAction: 'ANSWER_QUESTION' });
  return failureResultSchema.parse({ primaryReason: 'UNKNOWN', secondaryReasons: [], confidence: 0.35, evidence: cart ? [{ source: 'cart', text: `Cart total ${cart.totalAmount} ${cart.currency}.` }] : [], reasonType: 'UNKNOWN', recommendedAction: 'REQUEST_MORE_INFORMATION' });
}
