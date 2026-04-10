-- Ids/names must match lib/base-kinks.ts (local deck). Keeps FK targets stable for user_kink_preferences.
insert into public.kinks (id, name, description, category_id)
overriding system value
select v.id, v.name, null::text, c.id
from (
  values
    (1, 'bondage'),
    (2, 'roleplay'),
    (3, 'public play'),
    (4, 'voyeurism')
) as v(id, name)
cross join lateral (
  select id
  from public.categories
  where name = 'General'
  order by id
  limit 1
) as c
on conflict (id) do update set name = excluded.name;
