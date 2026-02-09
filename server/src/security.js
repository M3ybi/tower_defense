// server/src/security.js
import crypto from "crypto";
import helmet from "helmet";
import rateLimit from "express-rate-limit";

/**
 * Attach security middleware (Helmet, rate limiting, etc.)
 * - In development: CSP is disabled to avoid blocking CDN scripts.
 * - In production: strict CSP with explicit allowlists for the game assets.
 */
export function securityMiddleware(app) {
  const isProd = process.env.NODE_ENV === "production";

  const helmetConfig = {
    // A-Frame / WebGL don’t play nicely with COEP in many setups.
    crossOriginEmbedderPolicy: false
  };

  if (isProd) {
    // PRODUCTION: strict CSP but with allow-listed CDNs you actually use.
    helmetConfig.contentSecurityPolicy = {
      useDefaults: true,
      directives: {
        defaultSrc: ["'self'"],

        // JS: A-Frame + plugins + jQuery from CDNs
        scriptSrc: [
          "'self'",
          "'unsafe-eval'",
          "https://aframe.io",
          "https://cdn.aframe.io",
          "https://ajax.googleapis.com",
          "https://cdn.jsdelivr.net",
          "https://cdn.rawgit.com",
          "https://rawgit.com"
        ],

        // Textures / images (including Imgur)
        imgSrc: [
          "'self'",
          "data:",
          "blob:",
          "https://i.imgur.com"
        ],

        // CSS: local + optional Google Fonts
        styleSrc: [
          "'self'",
          "'unsafe-inline'",          // A-Frame & your UI use some inline styles
          "https://fonts.googleapis.com"
        ],

        // Fonts: local + CDN / A-Frame fonts
        fontSrc: [
          "'self'",
          "https://fonts.gstatic.com",
          "https://cdn.aframe.io"
        ],

        // XHR / fetch targets (keep tight)
        connectSrc: ["'self'", "https://aframe.io", "https://cdn.jsdelivr.net"],

        // Audio / video (if you add any)
        mediaSrc: ["'self'"],

        // Never allow <object>, <embed>, <applet>
        objectSrc: ["'none'"],

        // Upgrade http->https on external requests (ok when you are on HTTPS)
        upgradeInsecureRequests: []
      }
    };
  } else {
    // DEVELOPMENT: no CSP → easy debugging, CDNs work without config.
    helmetConfig.contentSecurityPolicy = false;
  }

  app.use(helmet(helmetConfig));

  // Basic rate limiting for all routes (API + HTML)
  app.use(
    rateLimit({
      windowMs: 60_000,         // 1 minute
      max: 240,                 // 240 req / min per IP hash
      standardHeaders: true,
      legacyHeaders: false
    })
  );
}

/**
 * Issue CSRF cookie (double-submit token).
 * Called e.g. on /auth/csrf or first HTML response.
 */
export function issueCsrfCookie(res) {
  const token = crypto.randomBytes(32).toString("hex");
  res.cookie("XSRF-TOKEN", token, {
    httpOnly: false, // must be readable by JS to send in X-CSRF-Token header
    sameSite: "Lax",
    secure: process.env.COOKIE_SECURE === "true",
    path: "/"
  });
  return token;
}

/**
 * Validate CSRF token for state-changing requests (POST/PUT/PATCH/DELETE).
 * Use as per-route middleware before handlers that modify state.
 */
export function requireCsrf(req, res, next) {
  const cookieToken = req.cookies["XSRF-TOKEN"];
  const headerToken = req.get("X-CSRF-Token");
  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return res.status(403).json({ error: "CSRF validation failed" });
  }
  return next();
}

export function requireCsrfDevSafe(req, res, next) {
  // In production, enforce CSRF; in dev, skip it for convenience
  if (process.env.NODE_ENV === "production") {
    return requireCsrf(req, res, next);
  }
  return next();
}


/**
 * One-way hash of client IP for logging / rate-limiting without storing raw IPs.
 */
export function ipHash(req) {
  const ip =
    (req.headers["x-forwarded-for"]?.toString().split(",")[0] || "").trim() ||
    req.socket.remoteAddress ||
    "";
  return crypto.createHash("sha256").update(ip).digest("hex");
}
