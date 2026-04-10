-- Ids must match app/lib/local-kinks.ts (UNLOCK_SUBKINKS_BY_PARENT_ID) for FK user_kink_preferences_kink_fk.
insert into public.kinks (id, name, description, category_id)
overriding system value
select v.id, v.name, null::text, c.id
from (
  values
    (101, 'Rope bondage'),
    (102, 'Shibari'),
    (103, 'Teacher/student'),
    (104, 'Boss/employee')
) as v(id, name)
cross join lateral (
  select id
  from public.categories
  where name = 'General'
  order by id
  limit 1
) as c
on conflict (id) do update set name = excluded.name;
