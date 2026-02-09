// server/src/server.js
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

import { securityMiddleware } from "./security.js";
import { authRoutes } from "./routes/auth.routes.js";
import { runRoutes } from "./routes/run.routes.js";
import { verifySession } from "./auth/jwt.js";
import { initSchema } from "./db.js";


// ---------- Resolve project root & views ----------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Your structure is: <root> / { css, js, server, views, ... }
// server/src/server.js  ->  go up two levels to reach <root>
const ROOT_DIR = path.resolve(__dirname, "..", "..");
const VIEWS_DIR = path.join(ROOT_DIR, "views");

function resolveHtmlPath(filename) {
  const inViews = path.join(VIEWS_DIR, filename);
  if (fs.existsSync(inViews)) return inViews;
  return path.join(ROOT_DIR, filename);
}

const app = express();
const allowedOrigins = String(process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

// Security / rate limiting
securityMiddleware(app);

// Body + cookies
app.use(cookieParser());
app.use(express.json({ limit: "256kb" }));

// CORS for API (same origin in dev, but keep it)
app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true
  })
);

// ---------- Static assets (CSS, JS, images, etc.) ----------
// This lets /css/... and /js/... work when you are at / or /tower-defense.html
app.use(express.static(ROOT_DIR));

// ---------- HTML pages ----------

// Setup / login screen
app.get(["/", "/index.html"], (_req, res) => {
  res.sendFile(resolveHtmlPath("index.html"));
});

// Game page (new canonical path + legacy alias)
app.get(["/tower-defense.html", "/tower_defense.html"], (_req, res) => {
  res.sendFile(resolveHtmlPath("tower-defense.html"));
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

async function bootstrap() {
  try {
    await initSchema();
    app.listen(PORT, () => {
      console.log(`Backend listening on http://127.0.0.1:${PORT}`);
    });
  } catch (err) {
    console.error("Failed to initialize server:", err);
    process.exit(1);
  }
}

void bootstrap();
