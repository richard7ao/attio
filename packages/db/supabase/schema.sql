-- Attio — Supabase schema
-- Run in Supabase SQL editor. Auth is handled by Supabase Auth (auth.users).

-- ============================================================================
-- Extensions
-- ============================================================================
create extension if not exists "uuid-ossp";

-- ============================================================================
-- Profiles (1:1 with auth.users)
-- ============================================================================
create type public.user_role as enum ('owner', 'admin', 'member');

create table if not exists public.profiles (
  id          uuid primary key references auth.users(id) on delete cascade,
  email       text unique not null,
  full_name   text,
  avatar_url  text,
  role        public.user_role not null default 'member',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Outreach — all transactions and messaging, scoped to a user
-- ============================================================================
create type public.outreach_channel as enum ('email', 'voice', 'sms', 'n8n', 'attio');
create type public.outreach_status   as enum ('pending', 'sent', 'delivered', 'replied', 'failed', 'archived');

create table if not exists public.outreach (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  channel      public.outreach_channel not null default 'email',
  status       public.outreach_status  not null default 'pending',
  subject      text,
  body         text,
  recipient    text,
  external_id  text,
  metadata     jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists outreach_user_id_idx        on public.outreach (user_id);
create index if not exists outreach_user_created_idx    on public.outreach (user_id, created_at desc);
create index if not exists outreach_status_idx          on public.outreach (status);
create index if not exists outreach_metadata_gin_idx    on public.outreach using gin (metadata);

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles enable row level security;
alter table public.outreach enable row level security;

-- Profiles: a user can read/update only their own profile.
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Outreach: a user can fully manage only their own rows.
create policy "outreach_select_own" on public.outreach
  for select using (auth.uid() = user_id);

create policy "outreach_insert_own" on public.outreach
  for insert with check (auth.uid() = user_id);

create policy "outreach_update_own" on public.outreach
  for update using (auth.uid() = user_id);

create policy "outreach_delete_own" on public.outreach
  for delete using (auth.uid() = user_id);

-- ============================================================================
-- updated_at trigger
-- ============================================================================
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles
  for each row execute function public.touch_updated_at();

drop trigger if exists outreach_touch on public.outreach;
create trigger outreach_touch before update on public.outreach
  for each row execute function public.touch_updated_at();
