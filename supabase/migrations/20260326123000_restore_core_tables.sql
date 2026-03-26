create table if not exists public.categories (
  id integer primary key generated always as identity,
  name text not null,
  parent_id integer null
);

create table if not exists public.kinks (
  id integer primary key generated always as identity,
  name text not null,
  description text,
  category_id integer null references public.categories (id) on delete set null
);

create table if not exists public.user_kink_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  kink_id integer not null,
  value integer null,
  updated_at timestamptz not null default now(),
  constraint user_kink_preferences_value_check check (value is null or value in (0, 33, 67, 100)),
  constraint user_kink_preferences_user_fk foreign key (user_id) references auth.users (id) on delete cascade,
  constraint user_kink_preferences_kink_fk foreign key (kink_id) references public.kinks (id) on delete cascade,
  constraint user_kink_preferences_user_kink_unique unique (user_id, kink_id)
);

create index if not exists idx_user_kink_preferences_user_id
  on public.user_kink_preferences (user_id);

create index if not exists idx_user_kink_preferences_kink_id
  on public.user_kink_preferences (kink_id);
