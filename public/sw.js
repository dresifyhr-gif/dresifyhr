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
    data: { url: data.url || "/admin/", kind: data.kind || "info" }
  };

  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Zvuk + toast uživo u otvorenom adminu
      const clients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const c of clients) c.postMessage({ type: "push", data });
    })()
  );
});

// Klik na obavijest → fokusiraj postojeći admin tab (i idi na URL) ili otvori novi.
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "/admin/";
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
