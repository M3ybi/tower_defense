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

function toSafeFirstName(rawName) {
  const cleaned = String(rawName || "")
    .trim()
    .replace(/\s+/g, " ");
  if (!cleaned) return "Player";

  const firstToken = cleaned.split(" ")[0] || "Player";
  const safe = firstToken.replace(/[^\p{L}\p{N}_-]/gu, "");
  return (safe || "Player").slice(0, 24);
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
  const name = toSafeFirstName(prof.name ? String(prof.name) : "Player");

  // Privacy-first OAuth user linkage: bind by provider subject only.
  const userRow = await q(
    `
    with existing as (
      select ai.user_id as id
      from app_identity ai
      where ai.provider = 'amazon' and ai.provider_subject = $1
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
    values ((select id from resolved), 'amazon', $1, null)
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
