// server/src/routes/run.routes.js
import express from "express";
import crypto from "crypto";
import { z } from "zod";
import { q } from "../db.js";
import { requireCsrfDevSafe, ipHash, runStartLimiter, runFinishLimiter } from "../security.js";

export const runRoutes = express.Router();

// Keep in sync with js/index.js computeGameSettingsByLevel().
const DEFAULT_TAR_DIFF = 0;
const DEFAULT_DIS_DIFF = 0;
const DEFAULT_TARGETS = 2;
const DEFAULT_DISTRACTORS = 2;

const TARGETS_BY_LEVEL = Object.freeze({
  1: 2, 2: 2,
  3: 3, 4: 3, 5: 3, 11: 3, 12: 3, 21: 3,
  6: 4, 7: 4, 8: 4, 9: 4, 13: 4, 14: 4, 17: 4, 22: 4, 23: 4, 26: 4,
  10: 5, 15: 5, 16: 5, 18: 5, 19: 5, 20: 5, 24: 5, 25: 5, 27: 5, 28: 5, 29: 5,
  30: 6
});

const DISTRACTORS_BY_LEVEL = Object.freeze({
  1: 2,
  2: 3, 3: 3, 4: 3, 6: 3, 11: 3,
  5: 4, 7: 4, 8: 4, 10: 4, 12: 4, 13: 4, 15: 4, 21: 4, 22: 4, 24: 4,
  9: 5, 14: 5, 16: 5, 17: 5, 18: 5, 23: 5, 25: 5, 26: 5, 27: 5,
  19: 6, 28: 6,
  20: 7, 29: 7, 30: 7
});

function computeCanonicalSettingsByLevel(level) {
  let episodesCount;
  let episodeDurationMs;

  if (level <= 10) {
    episodesCount = 26;
    episodeDurationMs = 15000;
  } else if (level <= 20) {
    episodesCount = 32;
    episodeDurationMs = 12000;
  } else {
    episodesCount = 36;
    episodeDurationMs = 10000;
  }

  return {
    episodesCount,
    episodeDurationMs,
    targetsPerWave: TARGETS_BY_LEVEL[level] || DEFAULT_TARGETS,
    distractorsPerWave: DISTRACTORS_BY_LEVEL[level] || DEFAULT_DISTRACTORS,
    tarDiff: DEFAULT_TAR_DIFF,
    disDiff: DEFAULT_DIS_DIFF
  };
}

function requireAuth(req, res, next) {
  if (!req.user?.id) return res.status(401).json({ error: "Unauthorized" });
  return next();
}

runRoutes.get("/leaderboard", async (req, res) => {
  const rawLimit = Number(req.query.limit);
  const limit = Number.isFinite(rawLimit)
    ? Math.max(1, Math.min(Math.floor(rawLimit), 500))
    : 10;

  const includeCustom =
    String(req.query.includeCustom || "").trim() === "1" ||
    String(req.query.includeCustom || "").toLowerCase() === "true";

  const rows = await q(
    `
    with best_runs as (
      select distinct on (lr.user_id, lr.level)
        lr.user_id,
        lr.level,
        lr.custom,
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
        and lr.verified is true
        and ($2::boolean is true or lr.custom is false)
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
      br.custom,
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
    [limit, includeCustom]
  );

  const leaderboard = rows.rows.map((row, index) => ({
    rank: index + 1,
    userId: row.user_id,
    displayName: String(row.display_name || "Player").slice(0, 24),
    level: Number(row.level) || 1,
    custom: row.custom === true,
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
runRoutes.post("/run/start", requireAuth, runStartLimiter, requireCsrfDevSafe, async (req, res) => {
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
runRoutes.post("/run/finish", requireAuth, runFinishLimiter, requireCsrfDevSafe, async (req, res) => {
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
    `select id, started_at, level, episodes_total, episode_duration_ms, targets_per_wave, distractors_per_wave, tar_diff, dis_diff
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
  const episodeDurationMsMeta = Number(meta.episode_duration_ms);
  const targetsPerWave = meta.targets_per_wave === null ? null : Number(meta.targets_per_wave);
  const distractorsPerWave = meta.distractors_per_wave === null ? null : Number(meta.distractors_per_wave);
  const tarDiff = meta.tar_diff === null ? 0 : Number(meta.tar_diff) || 0;
  const disDiff = meta.dis_diff === null ? 0 : Number(meta.dis_diff) || 0;

  const canonical = computeCanonicalSettingsByLevel(level);
  const canonicalTargetsTotal = Math.max(0, canonical.targetsPerWave) * Math.max(0, canonical.episodesCount);
  const canonicalDistractorsTotal =
    Math.max(0, canonical.distractorsPerWave) * Math.max(0, canonical.episodesCount);

  const actualTargetsTotal =
    Number.isFinite(targetsPerWave) && episodesTotal > 0 ? Math.max(0, targetsPerWave) * episodesTotal : 0;
  const actualDistractorsTotal =
    Number.isFinite(distractorsPerWave) && episodesTotal > 0 ? Math.max(0, distractorsPerWave) * episodesTotal : 0;

  const isCustom =
    episodesTotal !== canonical.episodesCount ||
    episodeDurationMsMeta !== canonical.episodeDurationMs ||
    !Number.isFinite(targetsPerWave) ||
    !Number.isFinite(distractorsPerWave) ||
    targetsPerWave !== canonical.targetsPerWave ||
    distractorsPerWave !== canonical.distractorsPerWave ||
    tarDiff !== canonical.tarDiff ||
    disDiff !== canonical.disDiff;

  const anomalies = [];
  if (shots < red + green) anomalies.push("hits_gt_shots");
  if (durationMs <= 0 && shots > 0) anomalies.push("zero_duration_with_shots");

  const seconds = Math.max(1, durationMs / 1000);
  const shotsPerSecond = shots / seconds;
  const hitsPerSecond = (red + green) / seconds;
  if (shotsPerSecond > 20) anomalies.push("shots_per_second");
  if (hitsPerSecond > 20) anomalies.push("hits_per_second");

  const verified = anomalies.length === 0;
  const leaderboardEligible = verified && !isCustom;

  const redScale = actualTargetsTotal > 0 ? canonicalTargetsTotal / actualTargetsTotal : 1;
  const greenScale = actualDistractorsTotal > 0 ? canonicalDistractorsTotal / actualDistractorsTotal : 1;

  const accuracy = Math.max(0, Math.min(1, red / denom));
  const completionRate =
    canonicalTargetsTotal > 0 ? Math.max(0, Math.min(1.25, red / canonicalTargetsTotal)) : 0;

  // Score v2: weighted to make overall score the primary differentiator.
  const levelMul = 1 + Math.max(0, level - 1) * 0.06;
  const hitScore = Math.round(red * 10 * redScale - green * 14 * greenScale);
  const levelBonus = level * 25;
  const accuracyBonus = Math.round(accuracy * 200); // 0..200
  const completionBonus = Math.round(Math.max(0, Math.min(1, completionRate)) * 500); // 0..500
  const volumeBonus = Math.round((canonicalTargetsTotal * 2 + canonicalDistractorsTotal) * 0.4);
  // Changing diffs makes totals variable - treat as custom and avoid rewarding it.
  const varianceBonus = tarDiff + disDiff > 0 ? -Math.round((tarDiff + disDiff) * 12) : 0;

  const scoreTotal = Math.max(
    0,
    Math.round((hitScore + levelBonus + accuracyBonus + completionBonus + volumeBonus + varianceBonus) * levelMul)
  );

  await q(
    `update level_run
     set finished_at=$1,
         duration_ms=$2,
         completed=true,
         verified=$3,
         custom=$4,
         score_total=$5,
         red_hits=$6,
         green_hits=$7,
         shots=$8,
         accuracy_pct=$9,
         events=$10,
         flags=$11
     where id=$12 and user_id=$13`,
    [
      new Date(finishedAt).toISOString(),
      durationMs,
      verified,
      isCustom,
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
          canonical,
          canonicalTargetsTotal,
          canonicalDistractorsTotal,
          actualTargetsTotal,
          actualDistractorsTotal,
          normalization: { redScale, greenScale },
          verified,
          custom: isCustom,
          leaderboardEligible,
          anomalies,
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
      durationMs,
      verified,
      custom: isCustom,
      leaderboardEligible,
      anomalies,
      scoreBreakdown: {
        formula: "v2-normalized",
        canonical,
        canonicalTargetsTotal,
        canonicalDistractorsTotal,
        actual: {
          episodesTotal,
          episodeDurationMs: Number.isFinite(episodeDurationMsMeta) ? episodeDurationMsMeta : null,
          targetsPerWave,
          distractorsPerWave,
          tarDiff,
          disDiff
        },
        normalization: { redScale, greenScale },
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
    }
  });
});
