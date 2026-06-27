-- Attio — Voice outreach schema (additive to the Drizzle-managed core schema)
-- Owns the detail of voice-agent calls placed via SLNG. Each call also gets a
-- row in public.outreach (channel='voice') so it shows up in the unified team
-- dashboard; voice_calls.outreach_id links the two.
--
-- Reconciled to the core schema: user_id FKs public.users(id) (not profiles),
-- and uses gen_random_uuid() (built-in, no uuid-ossp extension required).
-- Safe to run on its own and re-run (idempotent).

-- ============================================================================
-- Enums
-- ============================================================================
do $$ begin
  create type public.voice_call_status as enum (
    'queued', 'ringing', 'in_progress', 'completed',
    'no_answer', 'voicemail', 'failed', 'canceled'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.voice_disposition as enum (
    'renewed', 'upsell_agreed', 'callback_scheduled', 'info_sent',
    'not_interested', 'no_answer', 'voicemail', 'do_not_call',
    'needs_human', 'unknown'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.voice_speaker as enum ('agent', 'customer', 'system');
exception when duplicate_object then null; end $$;

-- ============================================================================
-- voice_calls — one row per outbound call
-- ============================================================================
create table if not exists public.voice_calls (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references public.users(id) on delete cascade,
  outreach_id        uuid references public.outreach(id) on delete set null,

  -- who / why
  account_id         text,                       -- Attio record id (company)
  account_name       text,
  contact_name       text,
  to_number          text not null,              -- E.164
  from_number        text,
  goal               text,                       -- e.g. "renew annual contract"
  playbook           jsonb not null default '{}'::jsonb,  -- structured context/signal

  -- provider linkage
  provider           text not null default 'slng',
  provider_call_id   text,                       -- SLNG call_id
  livekit_room_name  text,                       -- for live observe (stretch)

  -- lifecycle
  status             public.voice_call_status not null default 'queued',
  disposition        public.voice_disposition,
  call_end_reason    text,
  summary            text,
  next_action        text,
  recording_url      text,                       -- OPEN QUESTION: SLNG availability
  started_at         timestamptz,
  ended_at           timestamptz,
  duration_ms        integer,

  metadata           jsonb not null default '{}'::jsonb,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create index if not exists voice_calls_user_idx          on public.voice_calls (user_id);
create index if not exists voice_calls_user_created_idx   on public.voice_calls (user_id, created_at desc);
create index if not exists voice_calls_status_idx         on public.voice_calls (status);
create unique index if not exists voice_calls_provider_call_uidx
  on public.voice_calls (provider, provider_call_id)
  where provider_call_id is not null;

-- ============================================================================
-- voice_transcript_segments — ordered conversation turns for a call
-- ============================================================================
create table if not exists public.voice_transcript_segments (
  id          uuid primary key default gen_random_uuid(),
  call_id     uuid not null references public.voice_calls(id) on delete cascade,
  seq         integer not null,                  -- monotonically increasing within a call
  speaker     public.voice_speaker not null,
  text        text not null,
  is_final    boolean not null default true,     -- false = interim/partial (live)
  ts_ms       integer,                           -- offset from call start, if known
  created_at  timestamptz not null default now()
);

create index if not exists voice_segments_call_seq_idx
  on public.voice_transcript_segments (call_id, seq);

-- ============================================================================
-- Row Level Security
--   Backend uses the service-role key, which BYPASSES RLS. These policies exist
--   so the frontend (anon/auth key) can READ a user's own calls + transcripts.
-- ============================================================================
alter table public.voice_calls enable row level security;
alter table public.voice_transcript_segments enable row level security;

do $$ begin
  create policy "voice_calls_select_own" on public.voice_calls
    for select using (auth.uid() = user_id);
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "voice_segments_select_own" on public.voice_transcript_segments
    for select using (
      exists (
        select 1 from public.voice_calls c
        where c.id = voice_transcript_segments.call_id
          and c.user_id = auth.uid()
      )
    );
exception when duplicate_object then null; end $$;

-- ============================================================================
-- updated_at trigger (touch_updated_at() is defined in schema.sql; redefined
-- here so this file is safe to run on its own)
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists voice_calls_touch on public.voice_calls;
create trigger voice_calls_touch before update on public.voice_calls
  for each row execute function public.touch_updated_at();

-- ============================================================================
-- Demo owner — lets the voice service create calls without a real auth user.
-- Set DEMO_USER_ID in apps/backend/voice/.env to this id.
-- ============================================================================
insert into public.users (id, email, full_name, role)
values ('00000000-0000-0000-0000-000000000001', 'demo@attio.local', 'Demo CSM', 'csm')
on conflict (id) do nothing;
