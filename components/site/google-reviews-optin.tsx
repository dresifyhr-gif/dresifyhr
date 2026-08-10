"use client";

import { useEffect } from "react";

// Google Customer Reviews opt-in — prikazuje se na /zahvala nakon narudžbe.
// Google (uz pristanak kupca) pošalje anketu nakon dostave → skuplja ocjene
// prodavača (zvjezdice u Google oglasima/Shoppingu). Podatke čita iz
// sessionStorage (postavlja checkout) da email NE ide u URL.
const MERCHANT_ID = 5837887280;

export function GoogleReviewsOptIn() {
  useEffect(() => {
    let data: { orderId?: string; email?: string } | null = null;
    try {
      data = JSON.parse(sessionStorage.getItem("dresify_gcr") || "null");
    } catch {
      data = null;
    }
    if (!data?.email) return;

    const eta = new Date();
    eta.setDate(eta.getDate() + 5); // procijenjena dostava ~5 dana
    const estimatedDelivery = eta.toISOString().slice(0, 10);

    const render = () => {
      const gapi = (window as unknown as { gapi?: { load: (m: string, cb: () => void) => void; surveyoptin?: { render: (o: unknown) => void } } }).gapi;
      gapi?.load("surveyoptin", () => {
        gapi.surveyoptin?.render({
          merchant_id: MERCHANT_ID,
          order_id: String(data?.orderId || Date.now()),
          email: data?.email,
          delivery_country: "HR",
          estimated_delivery_date: estimatedDelivery
        });
      });
    };

    (window as unknown as { renderOptIn?: () => void }).renderOptIn = render;

    if ((window as unknown as { gapi?: { surveyoptin?: unknown } }).gapi?.surveyoptin) {
      render();
    } else if (!document.getElementById("gcr-platform")) {
      const s = document.createElement("script");
      s.id = "gcr-platform";
      s.src = "https://apis.google.com/js/platform.js?onload=renderOptIn";
      s.async = true;
      s.defer = true;
      document.body.appendChild(s);
    }

    // Očisti da se ne okine ponovno pri re-mountu / povratku na stranicu.
    try {
      sessionStorage.removeItem("dresify_gcr");
    } catch {
      /* ignore */
    }
  }, []);

  return null;
}
