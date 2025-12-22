// server/src/server.js
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { securityMiddleware } from "./security.js";
import { authRoutes } from "./routes/auth.routes.js";
import { runRoutes } from "./routes/run.routes.js";
import { verifySession } from "./auth/jwt.js";


// ---------- Resolve project root & views ----------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your structure is: <root> / { css, js, server, views, ... }
// server/src/server.js  ->  go up two levels to reach <root>
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const VIEWS_DIR = path.join(ROOT_DIR, "views");

const app = express();

// Security / rate limiting
securityMiddleware(app);

// Body + cookies
app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));

// CORS for API (same origin in dev, but keep it)
app.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
  })
);

// ---------- Static assets (CSS, JS, images, etc.) ----------
// This lets /css/... and /js/... work when you are at / or /tower_defense.html
app.use(express.static(ROOT_DIR));

// ---------- HTML pages ----------

// Setup / login screen
app.get(["/", "/index.html"], (_req, res) => {
  res.sendFile(path.join(VIEWS_DIR, "index.html"));
});

// Game page
app.get("/tower_defense.html", (_req, res) => {
  res.sendFile(path.join(VIEWS_DIR, "tower_defense.html"));
});

// ---------- Auth session population ----------

app.use(async (req, _res, next) => {
  try {
    const token = req.cookies[process.env.COOKIE_NAME || "td_session"];
    if (!token) return next();

    const payload = await verifySession(token);
    if (payload) {
      req.user = {
        id: payload.uid,
        email: payload.email,
        name: payload.name
      };
    }
    return next();
  } catch {
    return next();
  }
});

// ---------- API routes ----------

app.use("/auth", authRoutes);
app.use("/api", runRoutes);

app.get("/health", (_req, res) => res.json({ ok: true }));

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Backend listening on http://127.0.0.1:${PORT}`);
});
