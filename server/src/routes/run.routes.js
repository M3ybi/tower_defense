// server/src/routes/run.routes.js
import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { q } from "../db.js";
import { requireCsrfDevSafe, ipHash } from "../security.js"; // keep or swap to requireCsrfDevSafe if you added it

export const runRoutes = express.Router();

function requireAuth(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
  return next();
}

// Start a run: server issues a run id + start time
runRoutes.post("/run/start", requireAuth, requireCsrfDevSafe, async (req, res) => {
  const schema = z.object({
    level: z.number().int().min(1).max(30),
    episodesTotal: z.number().int().min(1).max(999),
    episodeDurationMs: z.number().int().min(2000).max(60000),
    clientBuild: z.string().max(64).optional()
  });
  const body = schema.parse(req.body);

  const startedAt = new Date();
  const r = await q(
    `insert into level_run(user_id, level, started_at, episodes_total, episode_duration_ms, client_build, user_agent, ip_hash)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     returning id`,
    [
      req.user.id,
      body.level,
      startedAt.toISOString(),
      body.episodesTotal,
      body.episodeDurationMs,
      body.clientBuild || null,
      String(req.headers["user-agent"] || "").slice(0, 300),
      ipHash(req)
    ]
  );

  return res.json({ ok: true, runId: r.rows[0].id, startedAt: startedAt.toISOString() });
});

// Finish a run: accept event stream, recompute metrics server-side
runRoutes.post("/run/finish", requireAuth, requireCsrfDevSafe, async (req, res) => {
  const schema = z.object({
    // <= CHANGE IS HERE
    runId: z
      .union([
        z.number().int(),               // numeric id (what we actually use)
        z.string().regex(/^\d+$/)       // or numeric string "123"
      ])
      .transform((v) => Number(v)),
    finishedAt: z.string(),
    events: z
      .array(
        z.object({
          t: z.number().int().min(0).max(3_600_000), // ms since start
          type: z.enum(["shot", "hit_red", "hit_green"])
        })
      )
      .max(5000),
    flags: z.record(z.any()).optional()
  });

  const body = schema.parse(req.body);

  // Load run + ownership
  const rr = await q(
    `select id, started_at from level_run where id=$1 and user_id=$2`,
    [body.runId, req.user.id]
  );
  if (rr.rowCount === 0) return res.status(404).json({ error: "Run not found" });

  const startedAt = new Date(rr.rows[0].started_at).getTime();
  const finishedAt = new Date(body.finishedAt).getTime();
  const durationMs = Math.max(0, finishedAt - startedAt);

  // Recompute metrics (reliable relative to provided events)
  let shots = 0,
    red = 0,
    green = 0;
  for (const e of body.events) {
    if (e.type === "shot") shots += 1;
    else if (e.type === "hit_red") red += 1;
    else if (e.type === "hit_green") green += 1;
  }
  const scoreTotal = Math.max(0, red - green);
  const denom = Math.max(1, shots);
  const accPct = (red / denom) * 100;

  await q(
    `update level_run
     set finished_at=$1,
         duration_ms=$2,
         score_total=$3,
         red_hits=$4,
         green_hits=$5,
         shots=$6,
         accuracy_pct=$7,
         events=$8,
         flags=$9
     where id=$10 and user_id=$11`,
    [
      new Date(finishedAt).toISOString(),
      durationMs,
      scoreTotal,
      red,
      green,
      shots,
      accPct,
      JSON.stringify(body.events),
      JSON.stringify(body.flags || {}),
      body.runId,
      req.user.id
    ]
  );

  return res.json({
    ok: true,
    accepted: {
      scoreTotal,
      redHits: red,
      greenHits: green,
      shots,
      accuracyPct: Math.max(0, Math.min(100, accPct)),
      durationMs
    }
  });
});
