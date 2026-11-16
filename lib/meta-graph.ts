// Jedno mjesto za verziju Meta Graph API-ja (Instagram objava/statistika, token).
// v21.0 se gasi 21. 1. 2027.; v25.0 je izašao 18. 2. 2026. i vrijedi ~2 godine.
// Promjena verzije = samo ovdje (i u lib/meta-capi.ts, koji je dio webshopa).
export const GRAPH_VERSION = "v25.0";
export const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
