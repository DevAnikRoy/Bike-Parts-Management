-- Live RLS isolation proof (free). Paste into Supabase SQL Editor → Run.
-- Expect: NOTICE  RLS_ISOLATION_PASS
-- Failure: exception RLS_ISOLATION_FAIL…
-- Rolls back — no leftover test users/shops.

begin;

create temporary table _iso (
  uid_a uuid,
  uid_b uuid,
  shop_a uuid,
  shop_b uuid,
  part_id uuid
) on commit drop;

insert into _iso (uid_a, uid_b)
values (
  'a1111111-1111-4111-8111-1111111111a1',
  'b2222222-2222-4222-8222-2222222222b2'
);

delete from auth.users
where id in (select uid_a from _iso union all select uid_b from _iso);

do $setup$
declare
  v_instance uuid;
  v_uid_a uuid;
  v_uid_b uuid;
  v_shop_a uuid;
  v_shop_b uuid;
  v_part uuid;
begin
  select uid_a, uid_b into v_uid_a, v_uid_b from _iso;

  select id into v_instance from auth.instances limit 1;
  if v_instance is null then
    v_instance := '00000000-0000-0000-0000-000000000000';
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at, confirmation_token, email_change,
    email_change_token_new, recovery_token
  ) values
    (
      v_instance, v_uid_a, 'authenticated', 'authenticated',
      'rls-iso-a@bike-parts.test', crypt('x', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    ),
    (
      v_instance, v_uid_b, 'authenticated', 'authenticated',
      'rls-iso-b@bike-parts.test', crypt('x', gen_salt('bf')),
      now(), '{"provider":"email","providers":["email"]}'::jsonb, '{}'::jsonb,
      now(), now(), '', '', '', ''
    );

  insert into auth.identities (
    id, user_id, identity_data, provider, provider_id,
    last_sign_in_at, created_at, updated_at
  ) values
    (
      v_uid_a, v_uid_a,
      jsonb_build_object('sub', v_uid_a::text, 'email', 'rls-iso-a@bike-parts.test'),
      'email', v_uid_a::text, now(), now(), now()
    ),
    (
      v_uid_b, v_uid_b,
      jsonb_build_object('sub', v_uid_b::text, 'email', 'rls-iso-b@bike-parts.test'),
      'email', v_uid_b::text, now(), now(), now()
    );

  insert into shops (name) values ('ISO Shop A') returning id into v_shop_a;
  insert into shops (name) values ('ISO Shop B') returning id into v_shop_b;

  insert into profiles (id, shop_id, name, role) values
    (v_uid_a, v_shop_a, 'Iso A', 'owner'),
    (v_uid_b, v_shop_b, 'Iso B', 'owner');

  insert into shop_counters (shop_id, purchase_n, sale_n) values
    (v_shop_a, 0, 0), (v_shop_b, 0, 0)
  on conflict (shop_id) do nothing;

  select id into v_part from parts limit 1;
  if v_part is null then
    raise exception 'No parts — open the live app once while logged in (catalog seed), then re-run';
  end if;

  insert into stock_balances (shop_id, part_id, qty, avg_buy_price, sell_price)
  values (v_shop_a, v_part, 7, 10, 20)
  on conflict (shop_id, part_id) do update
    set qty = 7, avg_buy_price = 10, sell_price = 20;

  update _iso
  set shop_a = v_shop_a, shop_b = v_shop_b, part_id = v_part;
end
$setup$;

set local role authenticated;
select set_config('request.jwt.claim.sub', (select uid_b::text from _iso), true);
select set_config(
  'request.jwt.claims',
  (
    select json_build_object(
      'sub', uid_b,
      'role', 'authenticated',
      'email', 'rls-iso-b@bike-parts.test'
    )::text
    from _iso
  ),
  true
);

do $assert_b$
declare
  n bigint;
  v_shop_a uuid;
begin
  select shop_a into v_shop_a from _iso;
  select count(*) into n from stock_balances where shop_id = v_shop_a;
  if n <> 0 then
    raise exception 'RLS_ISOLATION_FAIL: B sees % rows of A stock', n;
  end if;
  select count(*) into n from stock_balances;
  if n <> 0 then
    raise exception 'RLS_ISOLATION_FAIL: B sees % stock rows total', n;
  end if;
end
$assert_b$;

select set_config('request.jwt.claim.sub', (select uid_a::text from _iso), true);
select set_config(
  'request.jwt.claims',
  (
    select json_build_object(
      'sub', uid_a,
      'role', 'authenticated',
      'email', 'rls-iso-a@bike-parts.test'
    )::text
    from _iso
  ),
  true
);

do $assert_a$
declare
  n bigint;
  v_part uuid;
begin
  select part_id into v_part from _iso;
  select coalesce(sum(qty), 0) into n from stock_balances where part_id = v_part;
  if n < 7 then
    raise exception 'RLS_ISOLATION_FAIL: A expected qty>=7 got %', n;
  end if;
end
$assert_a$;

reset role;
do $ok$ begin raise notice 'RLS_ISOLATION_PASS'; end $ok$;

rollback;
