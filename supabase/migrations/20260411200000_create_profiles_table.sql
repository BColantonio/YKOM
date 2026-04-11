-- User-facing metadata (username, avatar). Rows are created by handle_new_user on auth.users insert.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique,
  avatar_url text,
  created_at timestamp with time zone not null default now (),
  updated_at timestamp with time zone not null default now ()
);

create index if not exists idx_profiles_username on public.profiles (username);

alter table public.profiles enable row level security;

-- Signed-in users (including anonymous accounts) can read profiles for display names / avatars
create policy "profiles_select_authenticated"
  on public.profiles
  for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles
  for update
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Allow insert if trigger fails or backfill (id must match auth user)
create policy "profiles_insert_own"
  on public.profiles
  for insert
  with check (id = (select auth.uid()));

-- Keep updated_at fresh
create or replace function public.set_profiles_updated_at ()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated_at on public.profiles;

create trigger trg_profiles_updated_at
  before update on public.profiles
  for each row
  execute function public.set_profiles_updated_at ();

-- Auto-create profile for new auth users (email, anonymous, OAuth, etc.)
create or replace function public.handle_new_user ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_username text;
begin
  v_username := coalesce(
    nullif(trim(new.raw_user_meta_data->>'username'), ''),
    'kinkster_' || substr(md5(new.id::text), 1, 10)
  );

  -- De-duplicate if user-supplied username collides
  if exists (select 1 from public.profiles p where p.username = v_username) then
    v_username := 'kinkster_' || substr(md5(random()::text || new.id::text), 1, 12);
  end if;

  insert into public.profiles (id, username, avatar_url)
  values (new.id, v_username, null)
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user ();
