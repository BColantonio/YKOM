-- Follows graph + RLS. Idempotent: table may already exist from 20260411130000_create_follows_table.sql.

create extension if not exists "uuid-ossp";

create table if not exists public.follows (
  id uuid primary key default uuid_generate_v4 (),
  follower_id uuid references auth.users (id) on delete cascade not null,
  followed_id uuid references auth.users (id) on delete cascade not null,
  created_at timestamp with time zone default now ()
);

alter table public.follows enable row level security;

-- Prevent duplicate follows (named index; prior migration may use constraint follows_follower_followed_unique)
create unique index if not exists idx_follows_unique on public.follows (follower_id, followed_id);

-- Replace generic policies from earlier migration with role-scoped policies
drop policy if exists "follows_select_own" on public.follows;
drop policy if exists "follows_insert_own" on public.follows;
drop policy if exists "follows_delete_own" on public.follows;
drop policy if exists "Users can only follow as themselves" on public.follows;
drop policy if exists "Users can only unfollow themselves" on public.follows;
drop policy if exists "Users can view their own follows" on public.follows;
drop policy if exists "Anonymous users can manage their follows" on public.follows;

create policy "Users can only follow as themselves"
  on public.follows for insert
  to authenticated
  with check (follower_id = auth.uid());

create policy "Users can only unfollow themselves"
  on public.follows for delete
  to authenticated
  using (follower_id = auth.uid());

create policy "Users can view their own follows"
  on public.follows for select
  to authenticated
  using (follower_id = auth.uid());

-- Allow anonymous role when using the anon API key (signed-in guests use JWT role authenticated)
create policy "Anonymous users can manage their follows"
  on public.follows for all
  to anon
  using (follower_id = auth.uid())
  with check (follower_id = auth.uid());
