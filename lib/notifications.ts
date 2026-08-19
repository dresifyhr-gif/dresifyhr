import "server-only";

import nodemailer from "nodemailer";

import { CONTACT_EMAIL, WHATSAPP_NUMBER, GOOGLE_REVIEW_URL } from "@/lib/site";
import { getSettings } from "@/lib/settings";
import {
  type OrderPayload,
  buildCustomerOrderHtml,
  buildCustomerOrderSubject,
  buildCustomerOrderText,
  buildOrderHtml,
  buildOrderSubject,
  buildOrderText,
  buildWhatsAppNotification
} from "@/lib/orders";

type ChannelResult = {
  configured: boolean;
  sent: boolean;
  error?: string;
};

type NotificationResult = {
  email: ChannelResult;
  customerEmail: ChannelResult;
  whatsapp: ChannelResult;
  telegram: ChannelResult;
  configuredChannels: number;
  successfulChannels: number;
};

function hasEnvironment(keys: string[]) {
  return keys.every((key) => Boolean(process.env[key]?.trim()));
}

function createTransporter() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 465);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS?.trim();
  const secure = `${process.env.SMTP_SECURE || "true"}`.toLowerCase() !== "false";

  if (!host || !user || !pass) {
    return null;
  }

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: {
      user,
      pass
    }
  });
}

async function sendAdminEmail(order: OrderPayload): Promise<ChannelResult> {
  const transporter = createTransporter();

  if (!transporter) {
    return { configured: false, sent: false };
  }

  try {
    const from = process.env.ORDER_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim() || CONTACT_EMAIL;
    const to = process.env.ORDER_NOTIFICATION_EMAIL?.trim() || CONTACT_EMAIL;

    await transporter.sendMail({
      from,
      to,
      replyTo: order.email || undefined,
      subject: buildOrderSubject(order),
      text: buildOrderText(order),
      html: buildOrderHtml(order)
    });

    return { configured: true, sent: true };
  } catch (error) {
    return {
      configured: true,
      sent: false,
      error: error instanceof Error ? error.message : "Unknown email error"
    };
  }
}

async function sendCustomerEmail(order: OrderPayload): Promise<ChannelResult> {
  const transporter = createTransporter();

  if (!transporter || !order.email?.trim()) {
    return { configured: Boolean(transporter), sent: false };
  }

  try {
    const from = process.env.ORDER_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim() || CONTACT_EMAIL;

    await transporter.sendMail({
      from,
      to: order.email.trim(),
      replyTo: process.env.REPLY_TO_EMAIL?.trim() || CONTACT_EMAIL, // odgovori kupaca → naš gmail
      subject: buildCustomerOrderSubject(order),
      text: buildCustomerOrderText(order),
      html: buildCustomerOrderHtml(order)
    });

    return { configured: true, sent: true };
  } catch (error) {
    return {
      configured: true,
      sent: false,
      error: error instanceof Error ? error.message : "Unknown customer email error"
    };
  }
}

// "Tvoja narudžba je poslana" + tracking broj + link za praćenje. Šalje se automatski
// kad GLS tracking stigne (iz pin-import endpointa). Best-effort: ako SMTP nije
// postavljen ili kupac nema email, tiho preskoči (ne ruši uvoz trackinga).
export async function sendShippedTrackingEmail(o: {
  email?: string | null;
  customerName: string;
  tracking: string;
  courier?: string | null;
}): Promise<{ configured: boolean; sent: boolean }> {
  const transporter = createTransporter();
  if (!transporter || !o.email?.trim()) return { configured: Boolean(transporter), sent: false };
  try {
    const from = process.env.ORDER_FROM_EMAIL?.trim() || process.env.SMTP_USER?.trim() || CONTACT_EMAIL;
    const isHp = o.courier === "hp";
    const courierName = isHp ? "Hrvatske pošte" : "GLS-a";
    const trackUrl = isHp
      ? "https://posiljka.posta.hr/"
      : `https://gls-group.com/HR/hr/pracenje-posiljke?match=${encodeURIComponent(o.tracking)}`;
    const first = (o.customerName || "").trim().split(/\s+/)[0] || "";
    const subject = "Tvoja Dresify narudžba je poslana 🚚";
    const text =
      `Bok ${first}!\n\nTvoja narudžba je poslana putem ${courierName}.\n` +
      `Broj pošiljke za praćenje: ${o.tracking}\nPrati paket: ${trackUrl}\n\n` +
      `Plaćaš pouzećem kad paket stigne. Hvala na povjerenju!\nDresify`;
    const html = `
      <div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;color:#111111;background:#ffffff;border:1px solid #eeeeee;">
        <div style="background:#0A0A0A;color:#E8FF3C;padding:20px 24px;font-size:22px;font-weight:800;letter-spacing:1px;">DRESIFY</div>
        <div style="padding:24px;background:#ffffff;">
          <h1 style="font-size:20px;margin:0 0 12px;">Bok ${first}! Tvoja narudžba je poslana 🚚</h1>
          <p style="font-size:15px;line-height:1.6;color:#333;margin:0 0 16px;">Poslana je putem <b>${courierName}</b>. Plaćaš pouzećem kad paket stigne.</p>
          <div style="background:#F5F5F5;border-radius:10px;padding:16px;text-align:center;margin:0 0 16px;">
            <div style="font-size:12px;text-transform:uppercase;letter-spacing:1px;color:#888;">Broj pošiljke za praćenje</div>
            <div style="font-size:24px;font-weight:800;letter-spacing:2px;margin-top:4px;">${o.tracking}</div>
          </div>
          <a href="${trackUrl}" style="display:inline-block;background:#E8FF3C;color:#000;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:8px;">📦 Prati paket</a>
          <div style="margin:22px 0 0;padding:16px;background:#F5F5F5;border-radius:10px;">
            <p style="font-size:14px;color:#333;margin:0 0 10px;">⭐ Kad ti paket stigne i budeš zadovoljan — ostavi nam recenziju na Googleu, znači nam puno!</p>
            <a href="${GOOGLE_REVIEW_URL}" style="display:inline-block;background:#111;color:#fff;font-weight:700;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;">⭐ Ocijeni nas na Googleu</a>
          </div>
          <p style="font-size:13px;color:#888;margin:20px 0 0;">Hvala na povjerenju! — Dresify</p>
        </div>
      </div>`;
    await transporter.sendMail({ from, to: o.email.trim(), replyTo: process.env.REPLY_TO_EMAIL?.trim() || CONTACT_EMAIL, subject, text, html });
    return { configured: true, sent: true };
  } catch {
    return { configured: true, sent: false };
  }
}

async function sendWhatsAppViaTwilio(order: OrderPayload): Promise<ChannelResult> {
  const configured = hasEnvironment([
    "TWILIO_ACCOUNT_SID",
    "TWILIO_AUTH_TOKEN",
    "TWILIO_WHATSAPP_FROM",
    "TWILIO_WHATSAPP_TO"
  ]);

  if (!configured) {
    return { configured: false, sent: false };
  }

  try {
    const sid = process.env.TWILIO_ACCOUNT_SID!.trim();
    const token = process.env.TWILIO_AUTH_TOKEN!.trim();
    const from = process.env.TWILIO_WHATSAPP_FROM!.trim();
    const to = process.env.TWILIO_WHATSAPP_TO!.trim();

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams({
        From: from,
        To: to,
        Body: buildWhatsAppNotification(order)
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Twilio returned ${response.status}`);
    }

    return { configured: true, sent: true };
  } catch (error) {
    return {
      configured: true,
      sent: false,
      error: error instanceof Error ? error.message : "Unknown WhatsApp error"
    };
  }
}

async function sendWhatsAppViaZapier(order: OrderPayload): Promise<ChannelResult> {
  const webhookUrl = process.env.ZAPIER_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    return { configured: false, sent: false };
  }

  try {
    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        source: "dresify-order",
        order,
        whatsappTarget: process.env.ZAPIER_WHATSAPP_TARGET?.trim() || `+${WHATSAPP_NUMBER}`,
        message: buildWhatsAppNotification(order)
      })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Zapier webhook returned ${response.status}`);
    }

    return { configured: true, sent: true };
  } catch (error) {
    return {
      configured: true,
      sent: false,
      error: error instanceof Error ? error.message : "Unknown Zapier webhook error"
    };
  }
}

async function sendTelegram(order: OrderPayload): Promise<ChannelResult> {
  const botToken = process.env.TELEGRAM_BOT_TOKEN?.trim();
  const chatId = process.env.TELEGRAM_CHAT_ID?.trim();

  if (!botToken || !chatId) {
    return { configured: false, sent: false };
  }

  try {
    const message = buildWhatsAppNotification(order);
    const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: "HTML" })
    });

    if (!response.ok) {
      const detail = await response.text();
      throw new Error(detail || `Telegram API returned ${response.status}`);
    }

    return { configured: true, sent: true };
  } catch (error) {
    return {
      configured: true,
      sent: false,
      error: error instanceof Error ? error.message : "Unknown Telegram error"
    };
  }
}

async function sendWhatsApp(order: OrderPayload): Promise<ChannelResult> {
  const twilioResult = await sendWhatsAppViaTwilio(order);

  if (twilioResult.configured) {
    return twilioResult;
  }

  return sendWhatsAppViaZapier(order);
}

export async function sendOrderNotifications(order: OrderPayload): Promise<NotificationResult> {
  console.info("[orders] New order payload received", {
    customer: order.name,
    phone: order.phone,
    total: order.total,
    fulfillment: order.fulfillment,
    createdAt: order.createdAt
  });

  // Kanali se mogu ugasiti u Postavkama. Ugašen kanal = "nije konfiguriran"
  // (ne pokušava se slati i ne broji se kao neuspjeh).
  const off: ChannelResult = { configured: false, sent: false };
  const st = await getSettings().catch(() => null);
  const useEmail = st ? st.notifyEmail : true;
  const useTelegram = st ? st.notifyTelegram : true;
  const useWhatsapp = st ? st.notifyWhatsapp : true;

  const [email, customerEmail, whatsapp, telegram] = await Promise.all([
    useEmail ? sendAdminEmail(order) : Promise.resolve(off),
    sendCustomerEmail(order),
    useWhatsapp ? sendWhatsApp(order) : Promise.resolve(off),
    useTelegram ? sendTelegram(order) : Promise.resolve(off)
  ]);

  const configuredChannels =
    Number(email.configured) + Number(customerEmail.configured) + Number(whatsapp.configured) + Number(telegram.configured);
  const successfulChannels =
    Number(email.sent) + Number(customerEmail.sent) + Number(whatsapp.sent) + Number(telegram.sent);

  return {
    email,
    customerEmail,
    whatsapp,
    telegram,
    configuredChannels,
    successfulChannels
  };
}
