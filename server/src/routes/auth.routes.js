// server/src/routes/auth.routes.js
import express from "express";
import { googleStart, googleCallback } from "../auth/oauth_google.js";
import { amazonStart, amazonCallback } from "../auth/oauth_amazon.js";
import { requireCsrf } from "../security.js";
import { registerLocal, loginLocal, logoutLocal } from "../auth/local.js";
export const authRoutes = express.Router();

authRoutes.get("/me", async (req, res) => {
  return res.json({ ok: true, user: req.user || null });
});

authRoutes.post("/register", async (req, res) => {
  try {
    const { user } = await registerLocal(req, res);
    return res.json({ ok: true, user });
  } catch (e) {
    const status = e?.status || 400;
    return res.status(status).json({ error: e?.message || "Register failed" });
  }
});

authRoutes.post("/login", async (req, res) => {
  try {
    const { user } = await loginLocal(req, res);
    return res.json({ ok: true, user });
  } catch (e) {
    const status = e?.status || 400;
    return res.status(status).json({ error: e?.message || "Login failed" });
  }
});

// Logout should require CSRF (recommended)
authRoutes.post("/logout", requireCsrf, async (_req, res) => {
  res.clearCookie(process.env.COOKIE_NAME || "td_session", { path: "/" });
  return res.json({ ok: true });
});

// OAuth routes remain the same
authRoutes.get("/google/start", googleStart);
authRoutes.get("/google/callback", googleCallback);
authRoutes.get("/amazon/start", amazonStart);
authRoutes.get("/amazon/callback", amazonCallback);
authRoutes.post("/register", registerLocal);
authRoutes.post("/login", loginLocal);
authRoutes.post("/logout", logoutLocal);
