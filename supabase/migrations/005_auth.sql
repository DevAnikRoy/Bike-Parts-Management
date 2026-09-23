-- Email OTP accounts: one login = one shop.
-- Shared catalog is inserted by the app on first login (seed_catalog).
-- Phone/SMS is intentionally not used (no paid provider).

create or replace function public.ensure_my_shop()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_shop uuid;
  v_email text;
  v_name text;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select shop_id into v_shop from profiles where id = v_uid;
  if v_shop is not null then
    return jsonb_build_object('shop_id', v_shop, 'created', false);
  end if;

  select email into v_email from auth.users where id = v_uid;
  v_name := split_part(coalesce(v_email, 'owner'), '@', 1);
  if v_name is null or length(trim(v_name)) = 0 then
    v_name := 'মালিক';
  end if;

  insert into shops (name, address, phone, invoice_prefix)
  values ('আমার বাইক পার্টস', '', '', 'BPM')
  returning id into v_shop;

  insert into profiles (id, shop_id, name, phone, role)
  values (v_uid, v_shop, v_name, '', 'owner');

  insert into shop_counters (shop_id, purchase_n, sale_n)
  values (v_shop, 0, 0)
  on conflict (shop_id) do nothing;

  return jsonb_build_object('shop_id', v_shop, 'created', true);
end;
$$;

create or replace function public.seed_catalog(p_payload jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  perform pg_advisory_xact_lock(hashtext('bike_parts_seed_catalog'));

  if exists (select 1 from parts limit 1) then
    return;
  end if;

  insert into brands (id, name, name_bn)
  select (x->>'id')::uuid, x->>'name', x->>'name_bn'
  from jsonb_array_elements(coalesce(p_payload->'brands', '[]'::jsonb)) x
  on conflict (id) do nothing;

  insert into part_categories (id, name, name_bn, sort_order)
  select (x->>'id')::uuid, x->>'name', x->>'name_bn', coalesce((x->>'sort_order')::int, 0)
  from jsonb_array_elements(coalesce(p_payload->'categories', '[]'::jsonb)) x
  on conflict (id) do nothing;

  insert into bike_models (id, brand_id, name, name_bn, cc, year_from, active)
  select
    (x->>'id')::uuid,
    (x->>'brand_id')::uuid,
    x->>'name',
    x->>'name_bn',
    coalesce((x->>'cc')::int, 0),
    coalesce((x->>'year_from')::int, 2010),
    coalesce((x->>'active')::boolean, true)
  from jsonb_array_elements(coalesce(p_payload->'models', '[]'::jsonb)) x
  on conflict (id) do nothing;

  insert into parts (
    id, brand_id, category_id, name, name_bn, oem_part_no, tracking_mode,
    default_buy_price, default_sell_price, reorder_level, unit
  )
  select
    (x->>'id')::uuid,
    nullif(x->>'brand_id', '')::uuid,
    (x->>'category_id')::uuid,
    x->>'name',
    x->>'name_bn',
    x->>'oem_part_no',
    x->>'tracking_mode',
    coalesce((x->>'default_buy_price')::numeric, 0),
    coalesce((x->>'default_sell_price')::numeric, 0),
    coalesce((x->>'reorder_level')::int, 0),
    coalesce(x->>'unit', 'পিস')
  from jsonb_array_elements(coalesce(p_payload->'parts', '[]'::jsonb)) x
  on conflict (id) do nothing;

  insert into part_model_compatibility (part_id, model_id)
  select (x->>'part_id')::uuid, (x->>'model_id')::uuid
  from jsonb_array_elements(coalesce(p_payload->'compatibility', '[]'::jsonb)) x
  on conflict do nothing;
end;
$$;

create or replace function public.process_return_qty(
  p_part_id uuid,
  p_qty int,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_ret_id uuid := gen_random_uuid();
begin
  if v_shop is null then
    raise exception 'shop not found for user';
  end if;
  if p_qty is null or p_qty < 1 then
    raise exception 'qty required';
  end if;
  if not exists (select 1 from parts where id = p_part_id) then
    raise exception 'part not found';
  end if;

  insert into returns (
    id, shop_id, part_id, qty, reason, matched, created_by
  ) values (
    v_ret_id, v_shop, p_part_id, p_qty, coalesce(p_reason, ''), true, auth.uid()
  );

  insert into stock_balances (shop_id, part_id, qty, avg_buy_price, sell_price, updated_at)
  values (v_shop, p_part_id, p_qty, 0, 0, now())
  on conflict (shop_id, part_id) do update
  set qty = stock_balances.qty + excluded.qty, updated_at = now();

  insert into stock_movements (
    shop_id, part_id, movement_type, qty_delta, ref_type, ref_id, note, created_by
  ) values (
    v_shop, p_part_id, 'return', p_qty, 'return', v_ret_id, coalesce(p_reason, 'রিটার্ন'), auth.uid()
  );

  return jsonb_build_object('return_id', v_ret_id, 'matched', true);
end;
$$;

revoke all on function public.ensure_my_shop() from public, anon;
grant execute on function public.ensure_my_shop() to authenticated;

revoke all on function public.seed_catalog(jsonb) from public, anon;
grant execute on function public.seed_catalog(jsonb) to authenticated;

revoke all on function public.process_return_qty(uuid, int, text) from public, anon;
grant execute on function public.process_return_qty(uuid, int, text) to authenticated;

revoke all on function public.receive_purchase(uuid, text, jsonb) from public, anon;
grant execute on function public.receive_purchase(uuid, text, jsonb) to authenticated;

revoke all on function public.complete_sale(uuid, text, numeric, numeric, jsonb) from public, anon;
grant execute on function public.complete_sale(uuid, text, numeric, numeric, jsonb) to authenticated;

revoke all on function public.process_return_serial(text, text) from public, anon;
grant execute on function public.process_return_serial(text, text) to authenticated;

notify pgrst, 'reload schema';
