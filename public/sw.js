/* Dresify Admin — service worker (Web Push + PWA). Namjerno minimalan:
   NE kešira ništa agresivno da admin uvijek pokaže svježe podatke. */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Dolazi push s poslužitelja → prikaži obavijest + javi otvorenim karticama (uživo).
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (e) {
    data = { title: "Dresify", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Dresify";
  const options = {
    body: data.body || "",
    icon: "/icons/icon-192.png",
    badge: "/icons/badge-72.png",
    tag: data.tag || undefined,
    renotify: Boolean(data.tag),
    requireInteraction: data.kind === "order",
    vibrate: [90, 40, 90],
    data: { url: data.url || "/admin/", kind: data.kind || "info", itemId: data.itemId || null }
  };
  // Media autopilot: gumbi Pogledaj / Zaustavi izravno u obavijesti.
  if (data.kind === "autopilot" && data.itemId) {
    options.actions = [
      { action: "view", title: "Pogledaj" },
      { action: "stop", title: "Zaustavi" }
    ];
    options.requireInteraction = true;
  }

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Zvuk + toast uživo u otvorenom adminu
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      // Značka na ikoni kad admin NIJE otvoren na ekranu: skriven admin više ne pita
      // bazu (da Neon može spavati), pa oznaku "ima novih" daje push. Otvoren admin
      // sam drži točan broj — tada ga ne diramo (setAppBadge() bez broja je točka).
      const anyVisible = clients.some((c) => c.visibilityState === "visible" && String(c.url || "").includes("/admin"));
      if (data.kind === "order" && !anyVisible && self.navigator && self.navigator.setAppBadge) {
        try { await self.navigator.setAppBadge(); } catch (e) { /* nepodržano */ }
      }
      for (const c of clients) c.postMessage({ type: "push", data });
    })()
  );
});

// Klik na obavijest → fokusiraj postojeći admin tab (i idi na URL) ili otvori novi.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const nd = event.notification.data || {};
  // "Zaustavi" bez otvaranja admina: maknemo objavu iz rasporeda (kolačić prijave ide sam).
  if (event.action === "stop" && nd.itemId) {
    event.waitUntil(
      (async () => {
        let ok = false;
        try {
          const r = await fetch("/api/admin/media/" + encodeURIComponent(nd.itemId) + "/", {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "stop" })
          });
          ok = r.ok;
        } catch (e) {
          ok = false;
        }
        await self.registration.showNotification(ok ? "⏸ Objava zaustavljena" : "Zaustavljanje nije uspjelo", {
          body: ok ? "Nacrt čeka tvoju odluku u Media." : "Otvori Media → Kalendar i zaustavi ručno.",
          icon: "/icons/icon-192.png",
          data: { url: "/admin/media/?tab=kalendar", kind: "info" }
        });
      })()
    );
    return;
  }
  const url = nd.url || "/admin/";
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) {
        if (c.url.includes("/admin") && "focus" in c) {
          await c.focus();
          if ("navigate" in c) c.navigate(url).catch(() => {});
          return;
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(url);
    })()
  );
});
