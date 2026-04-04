import "server-only";

import nodemailer from "nodemailer";

import { CONTACT_EMAIL, WHATSAPP_NUMBER } from "@/lib/site";
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

  const [email, customerEmail, whatsapp] = await Promise.all([
    sendAdminEmail(order),
    sendCustomerEmail(order),
    sendWhatsApp(order)
  ]);

  const configuredChannels = Number(email.configured) + Number(customerEmail.configured) + Number(whatsapp.configured);
  const successfulChannels = Number(email.sent) + Number(customerEmail.sent) + Number(whatsapp.sent);

  return {
    email,
    customerEmail,
    whatsapp,
    configuredChannels,
    successfulChannels
  };
}
