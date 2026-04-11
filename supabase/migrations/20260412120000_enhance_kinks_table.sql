-- Enhance kinks table for hierarchy, ordering, and public read via RLS.

alter table public.kinks
  add column if not exists parent_id integer references public.kinks (id) on delete cascade,
  add column if not exists sort_order integer not null default 0,
  add column if not exists description text,
  add column if not exists is_active boolean not null default true;

-- If description already existed from earlier schema, the duplicate add was skipped above.

create index if not exists idx_kinks_parent_id on public.kinks (parent_id);

create index if not exists idx_kinks_sort_order on public.kinks (sort_order);

create index if not exists idx_kinks_is_active on public.kinks (is_active);

alter table public.kinks enable row level security;

drop policy if exists "Anyone can read active kinks" on public.kinks;

create policy "Anyone can read active kinks"
  on public.kinks for select
  to anon, authenticated
  using (is_active = true);

-- Reasonable defaults for existing rows (seed will refine sort_order)
update public.kinks
set
  sort_order = id
where
  sort_order = 0;

-- Unlock sub-kinks (101–104): bondage + roleplay parents
update public.kinks
set
  parent_id = 1
where
  id in (101, 102)
  and parent_id is null;

update public.kinks
set
  parent_id = 2
where
  id in (103, 104)
  and parent_id is null;
