import { describe, expect, it } from 'vitest';
import { classifyFailure, classifyIntent } from './analysis';

const event = (eventType: string, data: string) => ({ eventType, eventData: data } as never);

describe('deterministic analysis', () => {
  it('classifies payment problems from provider evidence', () => expect(classifyIntent([event('payment_failed', 'card declined')]).intent).toBe('PAYMENT_PROBLEM'));
  it('returns unknown when evidence is insufficient', () => expect(classifyIntent([event('page_view', 'home')]).intent).toBe('UNKNOWN'));
  it('keeps provider payment failures confirmed', () => expect(classifyFailure([], [{ status: 'FAILED', failureMessage: 'declined' }] as never).reasonType).toBe('CONFIRMED'));
  it('marks shipping evidence as inferred', () => expect(classifyFailure([event('checkout', 'shipping charge')], []).reasonType).toBe('INFERRED'));
});
