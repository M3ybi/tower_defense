// server/src/routes/auth.routes.js
import express from "express";
import { googleStart, googleCallback } from "../auth/oauth_google.js";
import { amazonStart, amazonCallback } from "../auth/oauth_amazon.js";
import { requireCsrf } from "../security.js";
import { registerLocal, loginLocal, logoutLocal } from "../auth/local.js";
import { q } from "../db.js";
import { z } from "zod";

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

function requireAuth(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ ok: false, error: "Unauthorized" });
  return next();
}

authRoutes.get("/me", async (req, res) => {
  if (!req.user?.id) {
    return res.json({ ok: true, user: null });
  }

  const userRow = await q(
    `select id, email, display_name from app_user where id = $1`,
    [req.user.id]
  );

  if (userRow.rowCount === 0) {
    return res.json({ ok: true, user: null });
  }

  return res.json({ ok: true, user: userRow.rows[0] });
});

authRoutes.patch(
  "/profile",
  requireAuth,
  requireCsrf,
  wrapAuth(async (req, res) => {
    const schema = z.object({
      displayName: z.string().trim().min(1).max(24)
    });
    const body = schema.parse(req.body);

    const updated = await q(
      `
      update app_user
      set display_name = $1
      where id = $2
      returning id, email, display_name
      `,
      [body.displayName, req.user.id]
    );

    if (updated.rowCount === 0) {
      return res.status(404).json({ ok: false, error: "User not found" });
    }

    return res.json({ ok: true, user: updated.rows[0] });
  })
);

authRoutes.post("/register", wrapAuth(registerLocal));
authRoutes.post("/login", wrapAuth(loginLocal));
authRoutes.post("/logout", requireCsrf, wrapAuth(logoutLocal));

authRoutes.get("/google/start", googleStart);
authRoutes.get("/google/callback", googleCallback);
authRoutes.get("/amazon/start", amazonStart);
authRoutes.get("/amazon/callback", amazonCallback);
