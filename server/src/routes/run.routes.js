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

runRoutes.get("/leaderboard", async (req, res) => {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(Math.floor(rawLimit), 500))
    : 10;

  const rows = await q(
    `
    with best_runs as (
      select distinct on (lr.user_id, lr.level)
        lr.user_id,
        lr.level,
        lr.targets_per_wave,
        lr.distractors_per_wave,
        lr.tar_diff,
        lr.dis_diff,
        greatest(
          0,
          coalesce(lr.score_total, coalesce(lr.red_hits, 0) - coalesce(lr.green_hits, 0))
        ) as score_total,
        coalesce(lr.red_hits, 0) as red_hits,
        coalesce(lr.green_hits, 0) as green_hits,
        coalesce(
          lr.accuracy_pct,
          case
            when coalesce(lr.shots, 0) > 0
              then (coalesce(lr.red_hits, 0)::double precision / greatest(1, lr.shots)) * 100
            else 0
          end
        ) as accuracy_pct,
        coalesce(lr.finished_at, lr.created_at) as finished_at,
        lr.duration_ms
      from level_run lr
      where lr.completed is true
        and coalesce(lr.score_total, lr.red_hits, lr.green_hits, lr.shots) is not null
      order by
        lr.user_id,
        lr.level,
        greatest(0, coalesce(lr.score_total, coalesce(lr.red_hits, 0) - coalesce(lr.green_hits, 0))) desc,
        coalesce(
          lr.accuracy_pct,
          case
            when coalesce(lr.shots, 0) > 0
              then (coalesce(lr.red_hits, 0)::double precision / greatest(1, lr.shots)) * 100
            else 0
          end
        ) desc,
        coalesce(lr.finished_at, lr.created_at) asc
    )
    select
      br.user_id as user_id,
      coalesce(au.display_name, 'Player') as display_name,
      br.level,
      br.targets_per_wave,
      br.distractors_per_wave,
      br.tar_diff,
      br.dis_diff,
      br.score_total,
      br.red_hits,
      br.green_hits,
      br.accuracy_pct,
      br.duration_ms,
      br.finished_at
    from best_runs br
    left join app_user au on au.id = br.user_id
    order by br.score_total desc, br.accuracy_pct desc, br.finished_at asc, br.level desc
    limit $1
    `,
    [limit]
  );

  const leaderboard = rows.rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    displayName: String(row.display_name || "Player").slice(0, 24),
    level: Number(row.level) || 1,
    targetsPerWave: row.targets_per_wave === null ? null : Number(row.targets_per_wave) || 0,
    distractorsPerWave: row.distractors_per_wave === null ? null : Number(row.distractors_per_wave) || 0,
    tarDiff: row.tar_diff === null ? null : Number(row.tar_diff) || 0,
    disDiff: row.dis_diff === null ? null : Number(row.dis_diff) || 0,
    scoreTotal: Number(row.score_total) || 0,
    redHits: Number(row.red_hits) || 0,
    greenHits: Number(row.green_hits) || 0,
    accuracyPct: typeof row.accuracy_pct === "number" ? row.accuracy_pct : 0,
    durationMs: Number(row.duration_ms) || 0,
    finishedAt: row.finished_at
  }));

  return res.json({ ok: true, leaderboard });
});

// Start a run: server issues a run id + start time
runRoutes.post("/run/start", requireAuth, requireCsrfDevSafe, async (req, res) => {
  const schema = z.object({
    level: z.number().int().min(1).max(30),
    episodesTotal: z.number().int().min(1).max(999),
    episodeDurationMs: z.number().int().min(2000).max(60000),
    targetsPerWave: z.number().int().min(0).max(99),
    distractorsPerWave: z.number().int().min(0).max(99),
    tarDiff: z.number().int().min(0).max(20),
    disDiff: z.number().int().min(0).max(20),
    clientBuild: z.string().max(64).optional()
  });
  const body = schema.parse(req.body);

  const startedAt = new Date();
  const r = await q(
    `insert into level_run(
       user_id,
       level,
       started_at,
       episodes_total,
       episode_duration_ms,
       targets_per_wave,
       distractors_per_wave,
       tar_diff,
       dis_diff,
       client_build,
       user_agent,
       ip_hash
     )
     values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     returning id`,
    [
      req.user.id,
      body.level,
      startedAt.toISOString(),
      body.episodesTotal,
      body.episodeDurationMs,
      body.targetsPerWave,
      body.distractorsPerWave,
      body.tarDiff,
      body.disDiff,
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
    completed: z.boolean(),
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
    `select id, started_at, level, episodes_total, targets_per_wave, distractors_per_wave, tar_diff, dis_diff
     from level_run
     where id=$1 and user_id=$2`,
    [body.runId, req.user.id]
  );
  if (rr.rowCount === 0) return res.status(404).json({ error: "Run not found" });

  const startedAt = new Date(rr.rows[0].started_at).getTime();
  const finishedAt = new Date(body.finishedAt).getTime();
  const durationMs = Math.max(0, finishedAt - startedAt);

  // If the level wasn't completed, record timing/events but do not score it.
  if (body.completed !== true) {
    await q(
      `update level_run
       set finished_at=$1,
           duration_ms=$2,
           completed=false,
           events=$3,
           flags=$4
       where id=$5 and user_id=$6`,
      [
        new Date(finishedAt).toISOString(),
        durationMs,
        JSON.stringify(body.events),
        JSON.stringify(body.flags || {}),
        body.runId,
        req.user.id
      ]
    );

    return res.json({ ok: true, accepted: null, skipped: "not_completed" });
  }

  // Recompute metrics (reliable relative to provided events)
  let shots = 0,
    red = 0,
    green = 0;
  for (const e of body.events) {
    if (e.type === "shot") shots += 1;
    else if (e.type === "hit_red") red += 1;
    else if (e.type === "hit_green") green += 1;
  }
  const denom = Math.max(1, shots);
  const accPct = (red / denom) * 100;

  const meta = rr.rows[0];
  const level = Number(meta.level) || 1;
  const episodesTotal = Number(meta.episodes_total) || 0;
  const targetsPerWave = meta.targets_per_wave === null ? null : Number(meta.targets_per_wave);
  const distractorsPerWave = meta.distractors_per_wave === null ? null : Number(meta.distractors_per_wave);
  const tarDiff = meta.tar_diff === null ? 0 : Number(meta.tar_diff) || 0;
  const disDiff = meta.dis_diff === null ? 0 : Number(meta.dis_diff) || 0;

  const expectedTargetsTotal =
    Number.isFinite(targetsPerWave) && episodesTotal > 0 ? Math.max(0, targetsPerWave) * episodesTotal : 0;
  const expectedDistractorsTotal =
    Number.isFinite(distractorsPerWave) && episodesTotal > 0 ? Math.max(0, distractorsPerWave) * episodesTotal : 0;

  const accuracy = Math.max(0, Math.min(1, red / denom));
  const completionRate =
    expectedTargetsTotal > 0 ? Math.max(0, Math.min(1.25, red / expectedTargetsTotal)) : 0;

  // Score v2: weighted to make overall score the primary differentiator.
  const levelMul = 1 + Math.max(0, level - 1) * 0.06;
  const hitScore = red * 10 - green * 14;
  const levelBonus = level * 25;
  const accuracyBonus = Math.round(accuracy * 200); // 0..200
  const completionBonus = Math.round(Math.max(0, Math.min(1, completionRate)) * 500); // 0..500
  const volumeBonus = Math.round((expectedTargetsTotal * 2 + expectedDistractorsTotal) * 0.4);
  const varianceBonus = Math.round((tarDiff + disDiff) * 12);

  const scoreTotal = Math.max(
    0,
    Math.round((hitScore + levelBonus + accuracyBonus + completionBonus + volumeBonus + varianceBonus) * levelMul)
  );

  await q(
    `update level_run
     set finished_at=$1,
         duration_ms=$2,
         completed=true,
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
      JSON.stringify({
        ...(body.flags || {}),
        scoreV2: {
          level,
          episodesTotal,
          targetsPerWave,
          distractorsPerWave,
          tarDiff,
          disDiff,
          expectedTargetsTotal,
          expectedDistractorsTotal,
          components: {
            hitScore,
            levelBonus,
            accuracyBonus,
            completionBonus,
            volumeBonus,
            varianceBonus,
            levelMul
          }
        }
      }),
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
