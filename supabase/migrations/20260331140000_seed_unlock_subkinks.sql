-- Sub-kinks referenced by in-app UNLOCK_RULES (lib/deck-unlock.ts). Idempotent.
insert into public.kinks (name, description, category_id)
select
  seed.name,
  seed.description,
  (select c.id from public.categories c where c.name = 'General' order by c.id limit 1)
from (
  values
    ('Rope bondage', null),
    ('Shibari', null),
    ('Teacher/student', null),
    ('Boss/employee', null)
) as seed(name, description)
where not exists (select 1 from public.kinks k where k.name = seed.name);
