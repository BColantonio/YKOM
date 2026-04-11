-- Seed data only (no schema changes). Safe to re-run: users skipped if present; prefs upsert; follows idempotent.
-- Requires: pgcrypto; migrations applied (profiles + handle_new_user, follows, kinks 1–4 and 101–104, user_kink_preferences).
--
-- Test users (same pattern as auth.admin.createUser): direct insert into auth.users + auth.identities with
-- email_confirmed_at = now(), raw_app_meta_data / raw_user_meta_data so the handle_new_user trigger creates
-- public.profiles with usernames from metadata (e.g. kinkexplorer, curiousfox).
--
-- Stored preference values must be 0, 33, 67, or 100 (app “maybe” = 33). Requested “34” in specs maps to 33 here.

create extension if not exists pgcrypto;

-- Kink catalog: stable ids for FKs; unlock sub-kinks 101–104 under parents 1 and 2 (see migration enhance_kinks_table).
insert into public.kinks (id, name, description, category_id, parent_id, sort_order, is_active)
overriding system value
select
  v.id,
  v.name,
  v.description,
  c.id,
  v.parent_id,
  v.sort_order,
  true
from (
  values
    (
      1,
      'Bondage',
      'Being tied up, restrained, or consensually doing the tying — trust, tension, and a little theatre.'::text,
      null::integer,
      10
    ),
    (
      2,
      'Roleplay',
      'Stepping into characters — playful scripts, costumes optional, chemistry required.',
      null,
      20
    ),
    (
      3,
      'Public play',
      'Thrills where someone might notice — risk, rush, and boundaries you set together.',
      null,
      30
    ),
    (
      4,
      'Voyeurism',
      'Watching or being watched — curiosity, consent, and the heat of attention.',
      null,
      40
    ),
    (
      5,
      'Sensory play',
      'Feathers, ice, blindfolds — waking up every nerve with curiosity and consent.',
      null,
      50
    ),
    (
      6,
      'Impact play',
      'Spanking, flogging, thuddy or stingy — consensual rhythm, heat, and aftercare.',
      null,
      60
    ),
    (
      7,
      'Power exchange',
      'Someone leads, someone follows — roles that feel deliciously clear (and reversible).',
      null,
      70
    ),
    (
      8,
      'Praise & spice',
      'Sweet words, teasing tones — building tension with voice alone.',
      null,
      80
    ),
    (
      9,
      'Exhibitionism',
      'Being seen (or almost seen) on purpose — thrill, flair, and negotiated risk.',
      null,
      90
    ),
    (
      10,
      'Dirty talk',
      'Whispered fantasies and bold requests — language as foreplay.',
      null,
      100
    ),
    (
      11,
      'Toys & tools',
      'Vibrators, cuffs, and gadgets — props that match your plot twist.',
      null,
      110
    ),
    (
      12,
      'Aftercare',
      'Cuddles, water, debrief — the soft landing after the scene.',
      null,
      120
    ),
    (
      101,
      'Rope bondage',
      'Rope as art and restraint — wraps, knots, and the slow dance of tension.',
      1,
      11
    ),
    (
      102,
      'Shibari',
      'Japanese-inspired rope — aesthetic, breath, and intention in every tie.',
      1,
      12
    ),
    (
      103,
      'Teacher/student',
      'Detention, lessons, and extra credit — power dynamics with a syllabus.',
      2,
      21
    ),
    (
      104,
      'Boss/employee',
      'Corner-office fantasies — deadlines, promotions, and very unprofessional behavior.',
      2,
      22
    )
) as v(id, name, description, parent_id, sort_order)
cross join lateral (
  select
    c.id
  from
    public.categories c
  where
    c.name = 'General'
  order by
    c.id
  limit
    1
) c
on conflict (id) do update
set
  name = excluded.name,
  description = excluded.description,
  category_id = excluded.category_id,
  parent_id = excluded.parent_id,
  sort_order = excluded.sort_order,
  is_active = excluded.is_active;

-- Fixed UUIDs so references are stable across runs.
-- Logins: kinkexplorer@test.com / curiousfox@test.com — password: password123

do $$
declare
  v_pw text := crypt('password123', gen_salt('bf'));
  v_instance uuid := '00000000-0000-0000-0000-000000000000'::uuid;
  v_kinkexplorer uuid := 'e0000001-0000-4000-a000-000000000001'::uuid;
  v_curiousfox uuid := 'e0000002-0000-4000-a000-000000000002'::uuid;
begin
  -- User 1: kinkexplorer
  if not exists (select 1 from auth.users where email = 'kinkexplorer@test.com') then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      v_kinkexplorer,
      v_instance,
      'authenticated',
      'authenticated',
      'kinkexplorer@test.com',
      v_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"kinkexplorer"}'::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      v_kinkexplorer,
      v_kinkexplorer,
      format('{"sub":"%s","email":"kinkexplorer@test.com"}', v_kinkexplorer)::jsonb,
      'email',
      v_kinkexplorer::text,
      now(),
      now(),
      now()
    );
  end if;

  -- User 2: curiousfox
  if not exists (select 1 from auth.users where email = 'curiousfox@test.com') then
    insert into auth.users (
      id,
      instance_id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at
    )
    values (
      v_curiousfox,
      v_instance,
      'authenticated',
      'authenticated',
      'curiousfox@test.com',
      v_pw,
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"username":"curiousfox"}'::jsonb,
      now(),
      now()
    );

    insert into auth.identities (
      id,
      user_id,
      identity_data,
      provider,
      provider_id,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      v_curiousfox,
      v_curiousfox,
      format('{"sub":"%s","email":"curiousfox@test.com"}', v_curiousfox)::jsonb,
      'email',
      v_curiousfox::text,
      now(),
      now(),
      now()
    );
  end if;
end $$;

-- Sample preferences: base 1–4 + unlock 101–104. Mixed tiers (100, 67, 33, 0) for later comparison demos.

insert into public.user_kink_preferences (user_id, kink_id, value, updated_at)
select u.id, v.kink_id, v.value, now()
from auth.users u
cross join (
  values
    (1, 100),
    (2, 67),
    (3, 33),
    (4, 0),
    (101, 100),
    (102, 67),
    (103, 33),
    (104, 0)
) as v (kink_id, value)
where u.email = 'kinkexplorer@test.com'
on conflict (user_id, kink_id) do update
set
  value = excluded.value,
  updated_at = excluded.updated_at;

insert into public.user_kink_preferences (user_id, kink_id, value, updated_at)
select u.id, v.kink_id, v.value, now()
from auth.users u
cross join (
  values
    (1, 0),
    (2, 100),
    (3, 67),
    (4, 33),
    (101, 67),
    (102, 0),
    (103, 100),
    (104, 33)
) as v (kink_id, value)
where u.email = 'curiousfox@test.com'
on conflict (user_id, kink_id) do update
set
  value = excluded.value,
  updated_at = excluded.updated_at;

-- Seed follow so "Your People" section shows data for the logged-in user:
-- curiousfox follows kinkexplorer → log in as curiousfox@test.com to see kinkexplorer in Your People.
insert into public.follows (follower_id, followed_id)
select c.id, k.id
from auth.users c
cross join auth.users k
where c.email = 'curiousfox@test.com'
  and k.email = 'kinkexplorer@test.com'
on conflict (follower_id, followed_id) do nothing;

-- Optional: set v_main_email to your real app login so db reset seeds a follow for that account too.
do $$
declare
  v_main_email text := null; -- e.g. 'you@example.com' — leave null to skip
begin
  if v_main_email is not null and length(trim(v_main_email)) > 0 then
    insert into public.follows (follower_id, followed_id)
    select m.id, k.id
    from auth.users m
    cross join auth.users k
    where lower(m.email) = lower(trim(v_main_email))
      and k.email = 'kinkexplorer@test.com'
    on conflict (follower_id, followed_id) do nothing;
  end if;
end $$;
