import "server-only";

import nodemailer from "nodemailer";

import { CONTACT_EMAIL } from "@/lib/site";

// Delivers newsletter signups to the shop owner via the channels that are
// already configured for orders (Telegram + admin email). No extra setup.

type DeliveryResult = { ok: boolean; delivered: number };

function createTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const secure = `${process.env.SMTP_SECURE || "true"}`.toLowerCase() !== "false";

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
}

async function notifyTelegram(email: string): Promise<boolean> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();
  if (!botToken || !chatId) return false;

  try {
    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `📧 <b>Nova newsletter prijava</b>\n${email}`,
        parse_mode: "HTML"
      })
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function notifyEmail(email: string): Promise<boolean> {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    const from = process.env.ORDER_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim() || CONTACT_EMAIL;
    const to = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || CONTACT_EMAIL;
    await transporter.sendMail({
      from,
      to,
      replyTo: email,
      subject: "Nova newsletter prijava — DRESIFY",
      text: `Novi pretplatnik na newsletter: ${email}`,
      html: `<p>Novi pretplatnik na newsletter:</p><p><strong>${email}</strong></p>`
    });
    return true;
  } catch {
    return false;
  }
}

export async function deliverNewsletterSignup(email: string): Promise<DeliveryResult> {
  const [telegram, mail] = await Promise.all([notifyTelegram(email), notifyEmail(email)]);
  const delivered = Number(telegram) + Number(mail);
  return { ok: delivered > 0, delivered };
}
