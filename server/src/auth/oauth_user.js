// server/src/auth/oauth_user.js
import { q } from "../db.js";

function normalizeEmail(raw) {
  const e = String(raw || "").trim().toLowerCase();
  return e && e.includes("@") ? e.slice(0, 254) : null;
}

async function findUserByIdentity({ provider, providerSubject }) {
  const r = await q(
    `
    select au.id, au.display_name
    from app_identity ai
    join app_user au on au.id = ai.user_id
    where ai.provider = $1 and ai.provider_subject = $2
    limit 1
    `,
    [provider, providerSubject]
  );
  return r.rowCount > 0 ? r.rows[0] : null;
}

async function createUserWithSafeName({ displayName, providerSubject }) {
  const r = await q(
    `
    insert into app_user(display_name)
    select
      case
        when not exists (select 1 from app_user where lower(display_name) = lower($1))
          then $1
        else left($1, 19) || '_' || substring(md5($2), 1, 4)
      end
    returning id, display_name
    `,
    [displayName, providerSubject]
  );
  return r.rowCount > 0 ? r.rows[0] : null;
}

async function upsertIdentity({ userId, provider, providerSubject, providerEmail }) {
  const email = normalizeEmail(providerEmail);
  // Update provider_email on conflict so we can fill it later (or refresh it) without changing linkage.
  const r = await q(
    `
    insert into app_identity(user_id, provider, provider_subject, provider_email)
    values ($1, $2, $3, $4)
    on conflict (provider, provider_subject)
    do update set provider_email = coalesce(excluded.provider_email, app_identity.provider_email)
    returning user_id
    `,
    [userId, provider, providerSubject, email]
  );
  return r.rowCount > 0 ? Number(r.rows[0].user_id) : null;
}

export async function resolveOrCreateOAuthUser({
  provider,
  providerSubject,
  displayName,
  providerEmail
}) {
  if (!provider || !providerSubject) return null;

  const existing = await findUserByIdentity({ provider, providerSubject });
  if (existing && existing.id) {
    // Best-effort: refresh provider email if we have one.
    await q(
      `
      update app_identity
      set provider_email = coalesce($4, provider_email)
      where provider=$1 and provider_subject=$2 and user_id=$3
      `,
      [provider, providerSubject, existing.id, normalizeEmail(providerEmail)]
    );
    return existing;
  }

  const created = await createUserWithSafeName({ displayName, providerSubject });
  if (!created || !created.id) return null;

  // If another request raced and created the identity first, the upsert will return that user_id.
  const resolvedUserId = await upsertIdentity({
    userId: created.id,
    provider,
    providerSubject,
    providerEmail
  });
  if (!resolvedUserId) return null;

  if (Number(resolvedUserId) !== Number(created.id)) {
    // Avoid leaving behind an orphaned user if we lost a race.
    await q(`delete from app_user where id=$1`, [created.id]);
  }

  const final = await q(`select id, display_name from app_user where id=$1 limit 1`, [resolvedUserId]);
  return final.rowCount > 0 ? final.rows[0] : null;
}

