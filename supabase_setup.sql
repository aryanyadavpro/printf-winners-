-- ── MANGA-MON Match Server (Supabase) ──────────────────────────────────────

-- Enable realtime on these tables (run in Supabase dashboard → Database → Replication)
-- ALTER PUBLICATION supabase_realtime ADD TABLE match_rooms, match_events;

-- ── Match Rooms ──────────────────────────────────────────────────────────────
create table if not exists match_rooms (
  id            text primary key,          -- matchId (uuid or room code)
  stake         text not null default '0.5',
  stage         int  not null default 0,   -- 0=lobby 1=draft 2=placement 3=match 4=result
  player1_addr  text,
  player2_addr  text,
  player1_squad jsonb default '[]',
  player2_squad jsonb default '[]',
  player1_formation jsonb default '{}',
  player2_formation jsonb default '{}',
  player1_points int default 10,
  player2_points int default 10,
  player1_ready bool default false,
  player2_ready bool default false,
  locked_cards  jsonb default '[]',        -- array of locked card ids
  winner_addr   text,
  scores        jsonb default '[]',
  stage_started_at timestamptz default now(),
  created_at    timestamptz default now()
);

-- ── Match Events (real-time message bus) ─────────────────────────────────────
-- Clients INSERT rows here; other clients receive them via Realtime subscription
create table if not exists match_events (
  id         bigserial primary key,
  match_id   text not null references match_rooms(id) on delete cascade,
  type       text not null,   -- 'pick_card' | 'unpick_card' | 'submit_formation' | 'stage_change' | 'result' | 'ping'
  payload    jsonb default '{}',
  sender     text,            -- wallet address of sender
  created_at timestamptz default now()
);

-- ── Queue (for random matchmaking) ────────────────────────────────────────────
create table if not exists match_queue (
  id         bigserial primary key,
  addr       text not null unique,
  stake      text not null,
  created_at timestamptz default now()
);

-- ── Indexes ──────────────────────────────────────────────────────────────────
create index if not exists match_events_match_id_idx on match_events(match_id);
create index if not exists match_events_created_at_idx on match_events(created_at desc);
create index if not exists match_queue_stake_idx on match_queue(stake);

-- ── RLS (disable for now — add policies when you add auth) ───────────────────
alter table match_rooms   disable row level security;
alter table match_events  disable row level security;
alter table match_queue   disable row level security;

-- ── Realtime ─────────────────────────────────────────────────────────────────
-- Run these two lines in the Supabase SQL editor to enable realtime:
-- alter publication supabase_realtime add table match_rooms;
-- alter publication supabase_realtime add table match_events;
