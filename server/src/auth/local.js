// server/src/auth/local.js
import { z } from "zod";
import bcrypt from "bcryptjs";
import { q } from "../db.js";
import { signSession } from "./jwt.js";
import { issueCsrfCookie } from "../security.js";

function setSessionCookie(res, jwt) {
  res.cookie(process.env.COOKIE_NAME || "td_session", jwt, {
    httpOnly: true,
    sameSite: "Lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/"
  });
  issueCsrfCookie(res);
}

const RegisterSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(10).max(200),
  displayName: z.string().min(1).max(24).optional()
});

const LoginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(200)
});

export async function registerLocal(req, res) {
  const body = RegisterSchema.parse(req.body);

  const email = body.email.toLowerCase().trim();
  const displayName = (body.displayName || "Player").slice(0, 24);

  const hash = await bcrypt.hash(body.password, 12);

  const r = await q(
    `insert into app_user(email, password_hash, display_name)
     values ($1,$2,$3)
     on conflict (email) do nothing
     returning id, email, display_name`,
    [email, hash, displayName]
  );

  if (r.rowCount === 0) return res.status(409).json({ ok: false, error: "Email already registered" });

  const user = r.rows[0];
  const jwt = await signSession({ uid: user.id, email: user.email, name: user.display_name });
  setSessionCookie(res, jwt);

  return res.json({ ok: true, user });
}

export async function loginLocal(req, res) {
  const body = LoginSchema.parse(req.body);

  const email = body.email.toLowerCase().trim();

  const r = await q(`select id, email, display_name, password_hash from app_user where email=$1`, [
    email
  ]);
  if (r.rowCount === 0) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const u = r.rows[0];

  // If user was created via OAuth, no password_hash exists
  if (!u.password_hash) return res.status(401).json({ ok: false, error: "Use OAuth to sign in" });

  const ok = await bcrypt.compare(body.password, u.password_hash);
  if (!ok) return res.status(401).json({ ok: false, error: "Invalid credentials" });

  const jwt = await signSession({ uid: u.id, email: u.email, name: u.display_name });
  setSessionCookie(res, jwt);

  return res.json({
    ok: true,
    user: { id: u.id, email: u.email, display_name: u.display_name }
  });
}

export async function logoutLocal(_req, res) {
  res.clearCookie(process.env.COOKIE_NAME || "td_session", { path: "/" });
  res.clearCookie("XSRF-TOKEN", { path: "/" });
  return res.json({ ok: true });
}
