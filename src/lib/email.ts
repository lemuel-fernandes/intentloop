import { Resend } from 'resend';
import nodemailer from 'nodemailer';

export function emailProvider() {
  if (process.env.RESEND_API_KEY && process.env.EMAIL_FROM) return { name: 'resend' as const, client: new Resend(process.env.RESEND_API_KEY) };
  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD) return { name: 'smtp' as const, client: nodemailer.createTransport({ host: process.env.SMTP_HOST, port: Number(process.env.SMTP_PORT ?? 587), secure: Number(process.env.SMTP_PORT) === 465, auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD } }) };
  return null;
}

export function unsubscribeUrl(customerId: string) { return `${process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'}/api/customers/${customerId}/unsubscribe`; }

export async function sendEmail(input: { to: string; subject: string; html: string }) {
  const provider = emailProvider();
  if (!provider) throw new Error('Email integration not configured.');
  if (provider.name === 'resend') { const result = await provider.client.emails.send({ from: process.env.EMAIL_FROM!, to: input.to, subject: input.subject, html: input.html }); return result.data?.id ?? null; }
  const result = await provider.client.sendMail({ from: process.env.EMAIL_FROM, ...input }); return result.messageId;
}
