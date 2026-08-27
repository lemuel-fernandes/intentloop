'use client';

import { useState } from 'react';

export function CustomerActions({ customerId, cartId }: { customerId: string; cartId?: string }) {
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  async function run(label: string, endpoint: string) {
    setBusy(label); setMessage('');
    try {
      const response = await fetch(endpoint, { method: 'POST' });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Action failed');
      setMessage(`${label} complete: ${payload.result?.intent ?? payload.result?.primaryReason ?? 'saved to database'}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Action failed'); }
    finally { setBusy(''); }
  }
  return <div className="action-links"><button className="action-link" disabled={Boolean(busy)} onClick={() => run('Intent analysis', `/api/customers/${customerId}/analyze-intent`)}>{busy === 'Intent analysis' ? 'running...' : 'Analyze intent'}</button>{cartId && <button className="action-link" disabled={Boolean(busy)} onClick={() => run('Failure analysis', `/api/carts/${cartId}/analyze-failure`)}>{busy === 'Failure analysis' ? 'running...' : 'Analyze failed sale'}</button>}{message && <p className={message.includes('complete') ? 'action-success' : 'action-error'}>{message}</p>}</div>;
}
