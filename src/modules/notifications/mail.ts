import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import { logger } from "@/lib/logger";

/**
 * Transactional email over SMTP (Mailpit locally, any SMTP relay in production). The provider
 * abstraction with Resend arrives with the notification engine (P7b); auth only needs this.
 * Never log recipients or bodies: they are personal data and may carry sign-in links.
 */
let transport: Transporter | undefined;

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendMail(message: MailMessage): Promise<void> {
  const { SMTP_URL, MAIL_FROM } = env();
  if (!SMTP_URL) {
    logger.warn({ subject: message.subject }, "SMTP_URL is not set; email not sent");
    return;
  }
  transport ??= nodemailer.createTransport(SMTP_URL);
  await transport.sendMail({ from: MAIL_FROM, ...message });
}

/** Escapes text for the small HTML email bodies below. */
export function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) =>
    c === "&" ? "&amp;" : c === "<" ? "&lt;" : c === ">" ? "&gt;" : c === '"' ? "&quot;" : "&#39;",
  );
}

/** A plain, accessible one-action email: heading, paragraph, one link. */
export function actionEmail(parts: {
  heading: string;
  body: string;
  action: string;
  url: string;
  footer: string;
}): { text: string; html: string } {
  const text = `${parts.heading}\n\n${parts.body}\n\n${parts.action}: ${parts.url}\n\n${parts.footer}\n`;
  const html = `<!doctype html><html lang="en"><body style="font-family:system-ui,sans-serif;line-height:1.5">
<h1 style="font-size:20px">${escapeHtml(parts.heading)}</h1>
<p>${escapeHtml(parts.body)}</p>
<p><a href="${escapeHtml(parts.url)}">${escapeHtml(parts.action)}</a></p>
<p style="font-size:13px">${escapeHtml(parts.footer)}</p>
</body></html>`;
  return { text, html };
}
