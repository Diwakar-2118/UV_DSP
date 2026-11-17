import nodemailer, { type Transporter } from 'nodemailer';
import { config } from '../config.js';

export type EmailStatus = { configured: boolean; transport: 'smtp' | 'json' | 'none'; detail: string };

export function emailStatus(): EmailStatus {
  if (config.emailTransport === 'json')
    return { configured: true, transport: 'json', detail: 'Test transport: messages are recorded in notification history but NOT delivered to an inbox.' };
  if (config.emailTransport === 'smtp' && config.smtp.host)
    return { configured: true, transport: 'smtp', detail: `SMTP via ${config.smtp.host}:${config.smtp.port}` };
  return { configured: false, transport: 'none', detail: 'Email is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS and EMAIL_FROM on the server.' };
}

let transporter: Transporter | null = null;
function getTransporter(): Transporter {
  if (transporter) return transporter;
  transporter =
    config.emailTransport === 'json'
      ? nodemailer.createTransport({ jsonTransport: true })
      : nodemailer.createTransport({
          host: config.smtp.host,
          port: config.smtp.port,
          secure: config.smtp.secure,
          auth: config.smtp.user ? { user: config.smtp.user, pass: config.smtp.pass } : undefined,
        });
  return transporter;
}

export async function sendEmail(to: string, subject: string, html: string, text: string) {
  const st = emailStatus();
  if (!st.configured) throw new Error(st.detail);
  const info = await getTransporter().sendMail({ from: config.smtp.from, to, subject, html, text });
  return { transport: st.transport, messageId: info.messageId as string, raw: st.transport === 'json' ? (info as any).message : undefined };
}

export const telegramConfigured = () => Boolean(config.telegramBotToken);

export async function sendTelegram(chatId: string, text: string) {
  if (!telegramConfigured()) throw new Error('Telegram is not configured. Set TELEGRAM_BOT_TOKEN on the server.');
  const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  });
  const data = (await res.json().catch(() => ({}))) as any;
  if (!res.ok || !data.ok) throw new Error(`Telegram error: ${data.description ?? res.status}`);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export interface DigestJob {
  title: string;
  company: string;
  location: string;
  match_score: number;
  apply_url: string | null;
  source_site: string;
  posted_at: string | Date;
}

export function renderDigest(name: string, jobs: DigestJob[]) {
  const rows = jobs
    .map(
      (j) => `<tr><td style="padding:12px;border-bottom:1px solid #e2e8f0">
        <div style="font-weight:600;color:#0f2a5c">${esc(j.title)}</div>
        <div style="color:#475569;font-size:13px">${esc(j.company)} · ${esc(j.location)} · via ${esc(j.source_site)}</div>
        <div style="margin-top:6px;font-size:13px"><span style="background:#e0edff;color:#1d4ed8;border-radius:10px;padding:2px 8px">${j.match_score}% match</span>
        ${j.apply_url ? ` &nbsp;<a href="${esc(j.apply_url)}" style="color:#1d4ed8">View &amp; apply →</a>` : ''}</div></td></tr>`,
    )
    .join('');
  const html = `<div style="font-family:Inter,Segoe UI,Arial,sans-serif;max-width:640px;margin:auto">
    <h2 style="color:#0f2a5c;margin-bottom:4px">CareerPilot AI – your daily job digest</h2>
    <p style="color:#475569">Hi ${esc(name || 'there')}, ${jobs.length} new matching job${jobs.length === 1 ? '' : 's'} since your last digest.</p>
    <table style="width:100%;border-collapse:collapse">${rows}</table>
    <p style="color:#94a3b8;font-size:12px;margin-top:16px">Manage alerts in <a href="${esc(config.appUrl)}/alerts">CareerPilot AI</a>.</p></div>`;
  const text = `CareerPilot AI daily digest – ${jobs.length} new job(s)\n\n${jobs
    .map((j) => `• ${j.title} – ${j.company} (${j.location}) – ${j.match_score}% match${j.apply_url ? `\n  ${j.apply_url}` : ''}`)
    .join('\n')}\n\nManage alerts: ${config.appUrl}/alerts`;
  const telegram = `<b>CareerPilot AI – ${jobs.length} new job(s)</b>\n\n${jobs
    .slice(0, 15)
    .map((j) => `• <b>${esc(j.title)}</b> – ${esc(j.company)} (${esc(j.location)}) · ${j.match_score}%${j.apply_url ? `\n<a href="${esc(j.apply_url)}">Apply</a>` : ''}`)
    .join('\n\n')}`;
  return { html, text, telegram };
}
