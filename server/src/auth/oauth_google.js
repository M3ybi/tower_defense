import crypto from "crypto";
import { q } from "../db.js";
import { signSession } from "./jwt.js";
import { issueCsrfCookie } from "../security.js";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { resolveRedirectUri } from "./oauth_config.js";

const GOOGLE_ISSUER = "https://accounts.google.com";
const JWKS = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

function base64url(buf) {
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function setStateCookie(res, value) {
  res.cookie("oauth_state", value, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/auth"
  });
}

function toSafeFirstName(rawName) {
  const cleaned = String(rawName || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleaned) return "Player";

  const firstToken = cleaned.split(" ")[0] || "Player";
  const safe = firstToken.replace(/[^\p{L}\p{N}_-]/gu, "");
  return (safe || "Player").slice(0, 24);
}

export function googleStart(req, res) {
  const state = crypto.randomBytes(24).toString("hex");
  setStateCookie(res, state);
  const redirectUri = resolveRedirectUri(req, "GOOGLE_REDIRECT_URI", "GOOGLE_REDIRECT_URIS");

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "openid profile",
    state
  });

  // Google authorize endpoint is part of its OIDC config :contentReference[oaicite:7]{index=7}
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function googleCallback(req, res) {
  const { code, state } = req.query;
  const redirectUri = resolveRedirectUri(req, "GOOGLE_REDIRECT_URI", "GOOGLE_REDIRECT_URIS");

  if (!code || !state || state !== req.cookies.oauth_state) {
    return res.status(400).send("OAuth state mismatch");
  }

  // Exchange code for tokens
  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: String(code),
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: redirectUri,
      grant_type: "authorization_code"
    })
  });

  if (!tokenRes.ok) return res.status(400).send("Token exchange failed");
  const tokenJson = await tokenRes.json();

  const idToken = tokenJson.id_token;
  if (!idToken) return res.status(400).send("Missing id_token");

  // Verify id_token (issuer, audience, signature via JWKS)
  const { payload } = await jwtVerify(idToken, JWKS, {
    issuer: GOOGLE_ISSUER,
    audience: process.env.GOOGLE_CLIENT_ID
  });

  const sub = String(payload.sub);
  const name = toSafeFirstName(payload.name ? String(payload.name) : "Player");

  // Privacy-first OAuth user linkage: bind by provider subject only.
  const userRow = await q(
    `
    with existing as (
      select ai.user_id as id
      from app_identity ai
      where ai.provider = 'google' and ai.provider_subject = $1
      limit 1
    ),
    created as (
      insert into app_user(display_name)
      select $2
      where not exists (select 1 from existing)
      returning id
    ),
    resolved as (
      select id from existing
      union all
      select id from created
      limit 1
    )
    insert into app_identity(user_id, provider, provider_subject, provider_email)
    values ((select id from resolved), 'google', $1, null)
    on conflict (provider, provider_subject) do nothing;

    select au.id, au.display_name
    from app_user au
    where au.id = (select id from resolved)
    `,
    [sub, name]
  );

  const u = userRow.rows[0];
  const jwt = await signSession({ uid: u.id, name: u.display_name });

  res.cookie(process.env.COOKIE_NAME || "td_session", jwt, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/"
  });
  issueCsrfCookie(res);

  res.clearCookie("oauth_state", { path: "/auth" });
  return res.redirect("/index.html");
}
