// server/src/routes/auth.routes.js
import express from "express";
import { googleStart, googleCallback } from "../auth/oauth_google.js";
import { amazonStart, amazonCallback } from "../auth/oauth_amazon.js";
import { requireCsrf } from "../security.js";
import { registerLocal, loginLocal, logoutLocal } from "../auth/local.js";

export const authRoutes = express.Router();

function wrapAuth(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (e) {
      if (res.headersSent) return;
      const status = e?.status || 400;
      return res.status(status).json({ error: e?.message || "Auth request failed" });
    }
  };
}

authRoutes.get("/me", async (req, res) => {
  return res.json({ ok: true, user: req.user || null });
});

authRoutes.post("/register", wrapAuth(registerLocal));
authRoutes.post("/login", wrapAuth(loginLocal));
authRoutes.post("/logout", requireCsrf, wrapAuth(logoutLocal));

authRoutes.get("/google/start", googleStart);
authRoutes.get("/google/callback", googleCallback);
authRoutes.get("/amazon/start", amazonStart);
authRoutes.get("/amazon/callback", amazonCallback);
