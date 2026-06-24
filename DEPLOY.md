# Biddr Deployment Runbook

This guide walks you through deploying Biddr for **free** using:

- **Netlify** for the React front-end
- **Render** for the Express/Socket.IO API
- **MongoDB Atlas** for the database (you should already have an M0 cluster)

When you're done, your site is live at:
- **`https://biddr.netlify.app`** (front-end, with HTTPS)
- **`https://biddr-api.onrender.com`** (API)

The two talk to each other transparently — the browser always hits the
Netlify origin, and Netlify's `netlify.toml` rewrites `/api/*` and
`/socket.io/*` to Render behind the scenes. **No CORS configuration in
the browser, no port juggling, no mixed-content warnings.**

---

## 0. Prerequisites (5 min)

1. Push this repo to **GitHub** (private or public — your call).
   ```bash
   git add -A
   git commit -m "chore: deploy config for Netlify + Render"
   git push origin main
   ```

2. Confirm **MongoDB Atlas** is reachable from anywhere:
   - Atlas → Security → **Network Access** → Add IP → `0.0.0.0/0`
     (Render's egress IP changes, so a static allowlist breaks)

3. **Rotate any secret** that was ever committed to git, including
   `JWT_SECRET` in `server/config.env` (rotate by generating a new one
   with `openssl rand -hex 64`).

---

## 1. Deploy the API to Render (≈5 min)

### Option A — Blueprint (recommended)

1. Go to <https://dashboard.render.com/> → **New** → **Blueprint**.
2. Connect your GitHub account if you haven't already.
3. Pick the **Biddr** repo. Render reads [`render.yaml`](./render.yaml)
   and pre-fills everything.
4. Click **Apply**. Render creates the `biddr-api` Web Service.
5. Open the service → **Environment** → fill in the missing secrets:
   - `MONGO_URI` — your Atlas connection string
   - `GOOGLE_CLIENT_ID` — your Google OAuth Web client ID
   - `CLIENT_URL` — leave blank for now, we'll set it in step 2
6. Wait for the first build. The service is healthy when
   `https://biddr-api.onrender.com/api/health` returns
   `{"status":"ok","app":"Biddr API",...}`.

### Option B — Manual

If you skipped the Blueprint, do it manually:
- New → **Web Service** → connect repo
- **Root directory:** `server`
- **Build command:** `npm install`
- **Start command:** `npm start`
- **Instance type:** Free
- Add the env vars listed above
- **Health check path:** `/api/health`

### Keep-alive (free-tier caveat)

Render's free tier spins down after 15 min of inactivity. The first
request after a sleep takes 30–60s. To keep it warm, point any free
uptime monitor at `https://biddr-api.onrender.com/api/health` every
14 minutes. Suggested services:

- <https://cron-job.org> (free, no account)
- <https://uptimerobot.com> (free, 50 monitors)

---

## 2. Deploy the front-end to Netlify (≈3 min)

### Option A — Continuous deploy from GitHub (recommended)

1. Go to <https://app.netlify.com/> → **Add new site** → **Import an
   existing project** → pick the Biddr repo.
2. Netlify auto-detects [`netlify.toml`](./netlify.toml) and configures:
   - **Base directory:** `client`
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
3. Add env vars in **Site settings → Environment variables**:
   - `VITE_API_BASE` = `/api`
   - `VITE_SOCKET_BASE` = *(empty)*
   - `VITE_GOOGLE_CLIENT_ID` = your Google OAuth Web client ID
4. Click **Deploy**. The site is live at a generated URL like
   `https://random-name-123.netlify.app`.

### Option B — Drag & drop

If you don't want to wire up GitHub:
1. Locally: `cd client && npm run build`
2. Drag the `client/dist` folder onto <https://app.netlify.com/drop>
3. The site is live immediately. (You'll need to set env vars
   manually since drag-and-drop skips the build step.)

### Edit the Netlify redirect target

In [`netlify.toml`](./netlify.toml), the two `[[redirects]]` rules point
at `https://biddr-api.onrender.com`. That's the default. If you rename
the Render service, update both `to` values and commit — Netlify will
redeploy automatically.

---

## 3. Wire the two together (≈2 min)

1. **Tell Render about Netlify.**
   In Render → `biddr-api` → Environment, set:
   ```
   CLIENT_URL=https://random-name-123.netlify.app
   ```
   *(Single value, no trailing slash.)*
   For multiple origins (e.g. main + a preview branch), set:
   ```
   CLIENT_URL=https://biddr.netlify.app,https://deploy-preview-12--biddr.netlify.app
   ```
   Save. Render will redeploy automatically.

2. **Tell Google about both domains.**
   In <https://console.cloud.google.com/apis/credentials> → your OAuth
   client → **Authorized JavaScript origins**, add:
   - `https://random-name-123.netlify.app`
   - `https://biddr-api.onrender.com`

3. **Smoke test** (≈30 s):
   - Open the Netlify URL in a private/incognito window
   - The landing page should load with no CORS errors in the console
   - Click **Sign in** → **Register** → create an account
   - `https://biddr-api.onrender.com/api/health` should return `ok`

---

## 4. Custom domain (optional, ~$10/yr)

The free `*.netlify.app` URL is HTTPS and looks professional. If you
want a clean custom domain like `biddr.live`:

1. Buy the domain on <https://namecheap.com> or
   <https://cloudflare.com> (`biddr.live` runs ~$10/yr).
2. In Netlify → **Domain settings** → **Add custom domain** → enter
   `biddr.live`. Netlify gives you DNS records (an `A` record and a
   `CNAME`).
3. Paste those records into your registrar's DNS panel.
4. Wait ~2 min for SSL to provision.
5. Add `biddr.live` to the `CLIENT_URL` env var on Render and to
   Google's **Authorized JavaScript origins** list.

---

## 5. Local dev still works the same way

Nothing about the dev experience changed:

```bash
# Terminal 1 — server on :5001
cd server && npm run dev

# Terminal 2 — client on :5173
cd client && npm run dev
```

The client uses `/api` and `/socket.io` everywhere. In dev, Vite's
proxy (in `client/vite.config.js`) forwards those to `localhost:5001`.
In production, Netlify's proxy (in `netlify.toml`) forwards them to
Render. The browser code is identical in both modes.

---

## 6. Cost summary

| Component | Free? | Notes |
|---|---|---|
| Netlify (front-end) | ✅ 100 GB bandwidth/mo, 300 build-min/mo | Plenty for a portfolio site |
| Render (API) | ✅ Free web service | Spins down after 15 min idle — see keep-alive tip |
| MongoDB Atlas | ✅ M0 cluster (512 MB) | Enough for thousands of users |
| Custom domain | ❌ ~$10/yr | Optional |
| **Total** | **$0/mo** with `*.netlify.app`, **$10/yr** with custom domain |

---

## 7. Troubleshooting

**"CORS error" in the browser console**
- Check Render's `CLIENT_URL` env var matches the exact Netlify URL
  (no trailing slash, correct protocol).
- Make sure the request is going to `/api/...` (relative), not
  `https://biddr-api.onrender.com/api/...` (absolute).

**"WebSocket connection failed" for Socket.IO**
- Confirm both redirects in `netlify.toml` use `force = true` — without
  it, the SPA fallback (`/*` → `/index.html`) shadows the proxy.

**First request takes 30–60s**
- Render free tier sleep. Set up a cron pinger (see step 1).

**MongoDB connection refused**
- Atlas Network Access must allow `0.0.0.0/0`, or at least the Render
  egress range. The connection string must include the database name
  (e.g. `/biddr?retryWrites=true&w=majority`).

**Netlify build fails with "Cannot find module"**
- `base = "client"` in `netlify.toml` means the build runs from the
  `client/` directory, so commands like `npm install` resolve that
  folder's `package.json` only. Don't change the base unless you also
  move the redirect targets.

---

## 8. File reference

| File | Purpose |
|---|---|
| [`netlify.toml`](./netlify.toml) | Netlify build + redirects |
| [`render.yaml`](./render.yaml) | Render Blueprint (infrastructure-as-code) |
| [`client/vite.config.js`](./client/vite.config.js) | Dev proxy for `/api` and `/socket.io` |
| [`client/src/lib/api.js`](./client/src/lib/api.js) | Axios instance, relative `baseURL: '/api'` |
| [`client/src/lib/socket.js`](./client/src/lib/socket.js) | Socket.IO client wrapper |
| [`client/src/lib/config.js`](./client/src/lib/config.js) | Env-driven `apiBase` / `socketBase` |
| [`client/.env.example`](./client/.env.example) | Client env template |
| [`server/src/index.js`](./server/src/index.js) | Express + Socket.IO server, CORS allowlist |
| [`server/config.env.example`](./server/config.env.example) | Server env template (real one is gitignored) |
| [`server/package.json`](./server/package.json) | `engines.node` pin for Render |