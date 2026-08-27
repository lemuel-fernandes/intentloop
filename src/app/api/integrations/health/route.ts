import { NextResponse } from 'next/server';

export async function GET() {
  const resend = Boolean(process.env.RESEND_API_KEY && process.env.EMAIL_FROM);
  const smtp = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
  const stripe = Boolean(process.env.STRIPE_SECRET_KEY);
  const openai = Boolean(process.env.OPENAI_API_KEY);
  return NextResponse.json({ integrations: { email: { configured: resend || smtp, provider: resend ? 'resend' : smtp ? 'smtp' : null, message: resend || smtp ? 'Email provider configured.' : 'Email integration not configured.' }, stripe: { configured: stripe, message: stripe ? 'Stripe test mode available.' : 'Stripe is not configured.' }, ai: { configured: openai, message: openai ? 'OpenAI-compatible provider configured.' : 'AI integration not configured; deterministic signals remain available.' } } });
}
