export const config = {
  googleClientId: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',

  // Base URL for the API. In production we want everything to go through
  // Netlify's same-origin rewrites so the browser never has to deal with
  // cross-origin requests, CORS, or a separate Socket.IO host. In dev we
  // default to a relative path (Vite's proxy handles it) so this file is
  // usable in both modes without any extra wiring.
  apiBase: import.meta.env.VITE_API_BASE || '/api',

  // Socket.IO base. Same logic as apiBase — relative in dev + prod, so
  // Netlify can rewrite /socket.io/* to the Render backend transparently.
  socketBase: import.meta.env.VITE_SOCKET_BASE || '',
}
