# Deploy Tower Defense on Render + Neon (Free Tier)

## 1) Create service from repo

1. Open Render Dashboard -> **New** -> **Blueprint**.
2. Select this GitHub repo (`M3ybi/tower_defense`).
3. Render will detect `render.yaml` and create:
   - `tower-defense-web` (free web service)

## 2) Set required environment variables

In `tower-defense-web` -> **Environment**, set:

- `DATABASE_URL` = your Neon pooled connection string (with `sslmode=require`)
- `CORS_ORIGIN` = your public Render URL (example: `https://tower-defense-web.onrender.com`)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_REDIRECT_URI` = `https://<your-domain>/auth/google/callback`
- `AMAZON_CLIENT_ID`
- `AMAZON_CLIENT_SECRET`
- `AMAZON_REDIRECT_URI` = `https://<your-domain>/auth/amazon/callback`

Notes:
- `JWT_SECRET` is auto-generated from `render.yaml`.
- `DATABASE_URL` is external (Neon) and must be set manually.
- DB schema is auto-created on app boot.

## 3) OAuth provider setup

Configure allowed redirect URIs in provider dashboards:

- Google: `https://<your-domain>/auth/google/callback`
- Amazon: `https://<your-domain>/auth/amazon/callback`

Use the same domain used in Render (or your custom domain).

## 4) Verify deployment

After deploy:

1. Open `https://<your-domain>/health` -> expect `{ "ok": true }`
2. Open `https://<your-domain>/index.html`
3. Start game -> open `https://<your-domain>/tower-defense.html`
4. Test login and run submission.

## 5) Free tier caveat

Render free web services can sleep on inactivity, so first request may be slower.
