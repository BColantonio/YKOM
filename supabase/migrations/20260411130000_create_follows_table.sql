-- Private follow graph: each row means follower_id follows followed_id.

create extension if not exists "uuid-ossp";

create table public.follows (
  id uuid primary key default uuid_generate_v4 (),
  follower_id uuid not null references auth.users (id) on delete cascade,
  followed_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamp with time zone not null default now (),
  constraint follows_follower_followed_unique unique (follower_id, followed_id)
);

create index if not exists idx_follows_follower_id on public.follows (follower_id);

alter table public.follows enable row level security;

-- Private follows: only the follower can see or manage their rows.
create policy "follows_select_own"
  on public.follows
  for select
  using (follower_id = (select auth.uid()));

create policy "follows_insert_own"
  on public.follows
  for insert
  with check (follower_id = (select auth.uid()));

create policy "follows_delete_own"
  on public.follows
  for delete
  using (follower_id = (select auth.uid()));
