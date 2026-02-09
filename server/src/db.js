import pg from "pg";

const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function q(text, params) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

export async function initSchema() {
  await q(`
    create table if not exists app_user (
      id bigserial primary key,
      email text unique,
      password_hash text,
      display_name varchar(24) not null default 'Player',
      created_at timestamptz not null default now()
    );
  `);

  await q(`
    create table if not exists app_identity (
      id bigserial primary key,
      user_id bigint not null references app_user(id) on delete cascade,
      provider varchar(20) not null,
      provider_subject text not null,
      provider_email text,
      created_at timestamptz not null default now(),
      unique (provider, provider_subject)
    );
  `);

  await q(`
    create table if not exists level_run (
      id bigserial primary key,
      user_id bigint not null references app_user(id) on delete cascade,
      level integer not null check (level >= 1 and level <= 30),
      started_at timestamptz not null,
      finished_at timestamptz,
      duration_ms integer,
      episodes_total integer not null,
      episode_duration_ms integer not null,
      client_build varchar(64),
      score_total integer,
      red_hits integer,
      green_hits integer,
      shots integer,
      accuracy_pct double precision,
      events jsonb,
      flags jsonb,
      user_agent varchar(300),
      ip_hash text,
      created_at timestamptz not null default now()
    );
  `);

  await q(`create index if not exists idx_level_run_user_id on level_run(user_id);`);
  await q(`create index if not exists idx_level_run_started_at on level_run(started_at);`);
}
