import crypto from "crypto";
import { q } from "../db.js";
import { signSession } from "./jwt.js";
import { issueCsrfCookie } from "../security.js";
import { resolveRedirectUri } from "./oauth_config.js";

function setStateCookie(res, value) {
  res.cookie("oauth_state", value, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/auth"
  });
}

export function amazonStart(req, res) {
  const state = crypto.randomBytes(24).toString("hex");
  setStateCookie(res, state);
  const redirectUri = resolveRedirectUri(req, "AMAZON_REDIRECT_URI", "AMAZON_REDIRECT_URIS");

  const params = new URLSearchParams({
    client_id: process.env.AMAZON_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: "profile",
    state
  });

  return res.redirect(`https://www.amazon.com/ap/oa?${params.toString()}`);
}

export async function amazonCallback(req, res) {
  const { code, state } = req.query;
  const redirectUri = resolveRedirectUri(req, "AMAZON_REDIRECT_URI", "AMAZON_REDIRECT_URIS");

  if (!code || !state || state !== req.cookies.oauth_state) {
    return res.status(400).send("OAuth state mismatch");
  }

  const tokenRes = await fetch("https://api.amazon.com/auth/o2/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code: String(code),
      client_id: process.env.AMAZON_CLIENT_ID,
      client_secret: process.env.AMAZON_CLIENT_SECRET,
      redirect_uri: redirectUri
    })
  });

  if (!tokenRes.ok) return res.status(400).send("Token exchange failed");
  const tokenJson = await tokenRes.json();

  // Fetch profile (subject-like id is returned as "user_id")
  const profRes = await fetch("https://api.amazon.com/user/profile", {
    headers: { Authorization: `Bearer ${tokenJson.access_token}` }
  });
  if (!profRes.ok) return res.status(400).send("Profile fetch failed");
  const prof = await profRes.json();

  const sub = String(prof.user_id);
  const email = prof.email ? String(prof.email).toLowerCase() : null;
  const name = prof.name ? String(prof.name) : "Player";

  const userRow = await q(
    `
    with u as (
      insert into app_user(email, display_name)
      values ($1, $2)
      on conflict (email) do update set display_name = excluded.display_name
      returning id, email, display_name
    )
    insert into app_identity(user_id, provider, provider_subject, provider_email)
    values ((select id from u), 'amazon', $3, $1)
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
