import crypto from "crypto";
import { q } from "../db.js";
import { signSession } from "./jwt.js";
import { issueCsrfCookie } from "../security.js";
import { jwtVerify, createRemoteJWKSet } from "jose";

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

export function googleStart(req, res) {
  const state = crypto.randomBytes(24).toString("hex");
  setStateCookie(res, state);

  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_REDIRECT_URI,
    response_type: "code",
    scope: "openid email profile",
    state
  });

  // Google authorize endpoint is part of its OIDC config :contentReference[oaicite:7]{index=7}
  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
}

export async function googleCallback(req, res) {
  const { code, state } = req.query;

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
      redirect_uri: process.env.GOOGLE_REDIRECT_URI,
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
  const email = payload.email ? String(payload.email).toLowerCase() : null;
  const name = payload.name ? String(payload.name) : "Player";

  // Upsert user + identity
  const userRow = await q(
    `
    with u as (
      insert into app_user(email, display_name)
      values ($1, $2)
      on conflict (email) do update set display_name = excluded.display_name
      returning id, email, display_name
    )
    insert into app_identity(user_id, provider, provider_subject, provider_email)
    values ((select id from u), 'google', $3, $1)
    on conflict (provider, provider_subject) do update set provider_email = excluded.provider_email
    returning (select id from u) as id, (select email from u) as email, (select display_name from u) as display_name
    `,
    [email, name.slice(0, 24), sub]
  );

  const u = userRow.rows[0];
  const jwt = await signSession({ uid: u.id, email: u.email, name: u.display_name });

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
