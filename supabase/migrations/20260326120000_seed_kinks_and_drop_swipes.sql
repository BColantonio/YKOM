insert into public.categories (name, parent_id)
select 'General', null
where not exists (
  select 1 from public.categories where name = 'General'
);

insert into public.kinks (name, description, category_id)
select
  seed.name,
  seed.description,
  (
    select c.id
    from public.categories c
    where c.name = 'General'
    order by c.id
    limit 1
  ) as category_id
from (
  values
    ('Bondage & restraint', null),
    ('Role play & fantasy', null),
    ('Sensory play', null),
    ('Power exchange (D/s)', null),
    ('Impact play', null),
    ('Exhibitionism', null),
    ('Voyeurism', null),
    ('Dirty talk', null),
    ('Toys & accessories', null),
    ('Edging & orgasm control', null),
    ('Aftercare & cuddling', null),
    ('Public play (risk-aware)', null)
) as seed(name, description)
where not exists (
  select 1 from public.kinks k where k.name = seed.name
);

drop table if exists public.swipes;
