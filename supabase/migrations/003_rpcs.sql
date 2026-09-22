-- Atomic RPCs for purchase receive and sale complete

create or replace function public.receive_purchase(
  p_supplier_id uuid,
  p_note text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_purchase_id uuid := gen_random_uuid();
  v_invoice text;
  v_total numeric := 0;
  v_item jsonb;
  v_part parts%rowtype;
  v_line_id uuid;
  v_qty int;
  v_price numeric;
  v_codes text[];
  v_code text;
  v_n int;
begin
  if v_shop is null then
    raise exception 'shop not found for user';
  end if;

  insert into shop_counters (shop_id, purchase_n, sale_n)
  values (v_shop, 0, 0)
  on conflict (shop_id) do nothing;

  update shop_counters
  set purchase_n = purchase_n + 1
  where shop_id = v_shop
  returning purchase_n into v_n;

  select invoice_prefix || '-P-' || lpad(v_n::text, 5, '0')
  into v_invoice
  from shops where id = v_shop;

  insert into purchases (id, shop_id, supplier_id, invoice_no, note, total, created_by)
  values (v_purchase_id, v_shop, p_supplier_id, v_invoice, coalesce(p_note, ''), 0, auth.uid());

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_part from parts where id = (v_item->>'part_id')::uuid;
    if not found then raise exception 'part not found'; end if;

    v_qty := (v_item->>'qty')::int;
    v_price := (v_item->>'buy_price')::numeric;
    v_line_id := gen_random_uuid();
    v_total := v_total + (v_qty * v_price);

    insert into purchase_lines (id, purchase_id, part_id, qty, buy_price, line_total)
    values (v_line_id, v_purchase_id, v_part.id, v_qty, v_price, v_qty * v_price);

    if v_part.tracking_mode = 'serialized'
       or (v_part.tracking_mode = 'optional_serial' and coalesce((v_item->>'generate_codes')::boolean, false))
       or (v_item ? 'serials' and jsonb_array_length(v_item->'serials') > 0) then

      if v_item ? 'serials' and jsonb_array_length(v_item->'serials') > 0 then
        select array_agg(x) into v_codes
        from jsonb_array_elements_text(v_item->'serials') as x;
      else
        select array_agg('BP-' || upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 10)))
        into v_codes
        from generate_series(1, v_qty);
      end if;

      if array_length(v_codes, 1) <> v_qty then
        raise exception 'serial count must match qty for %', v_part.name_bn;
      end if;

      foreach v_code in array v_codes
      loop
        insert into stock_units (
          shop_id, part_id, unique_code, status, purchase_id, purchase_line_id, buy_price
        ) values (
          v_shop, v_part.id, v_code, 'in_stock', v_purchase_id, v_line_id, v_price
        );

        insert into stock_balances (shop_id, part_id, qty, avg_buy_price, sell_price, updated_at)
        values (v_shop, v_part.id, 1, v_price, v_part.default_sell_price, now())
        on conflict (shop_id, part_id) do update
        set
          avg_buy_price = case
            when stock_balances.qty + 1 > 0 then
              (stock_balances.avg_buy_price * stock_balances.qty + v_price) / (stock_balances.qty + 1)
            else v_price end,
          qty = stock_balances.qty + 1,
          updated_at = now();

        insert into stock_movements (
          shop_id, part_id, unique_code, movement_type, qty_delta, ref_type, ref_id, note, created_by
        ) values (
          v_shop, v_part.id, v_code, 'purchase', 1, 'purchase', v_purchase_id, 'ক্রয়', auth.uid()
        );
      end loop;
    else
      insert into stock_balances (shop_id, part_id, qty, avg_buy_price, sell_price, updated_at)
      values (v_shop, v_part.id, v_qty, v_price, v_part.default_sell_price, now())
      on conflict (shop_id, part_id) do update
      set
        avg_buy_price = case
          when stock_balances.qty + v_qty > 0 then
            (stock_balances.avg_buy_price * stock_balances.qty + v_price * v_qty) / (stock_balances.qty + v_qty)
          else v_price end,
        qty = stock_balances.qty + v_qty,
        updated_at = now();

      insert into stock_movements (
        shop_id, part_id, movement_type, qty_delta, ref_type, ref_id, note, created_by
      ) values (
        v_shop, v_part.id, 'purchase', v_qty, 'purchase', v_purchase_id, 'ক্রয়', auth.uid()
      );
    end if;
  end loop;

  update purchases set total = v_total where id = v_purchase_id;

  return jsonb_build_object(
    'purchase_id', v_purchase_id,
    'invoice_no', v_invoice,
    'total', v_total
  );
end;
$$;

create or replace function public.complete_sale(
  p_customer_id uuid,
  p_note text,
  p_discount numeric,
  p_paid numeric,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_sale_id uuid := gen_random_uuid();
  v_invoice text;
  v_total numeric := 0;
  v_item jsonb;
  v_part parts%rowtype;
  v_unit stock_units%rowtype;
  v_line_id uuid;
  v_qty int;
  v_price numeric;
  v_n int;
  v_bal numeric;
begin
  if v_shop is null then raise exception 'shop not found for user'; end if;

  insert into shop_counters (shop_id, purchase_n, sale_n)
  values (v_shop, 0, 0)
  on conflict (shop_id) do nothing;

  update shop_counters set sale_n = sale_n + 1
  where shop_id = v_shop
  returning sale_n into v_n;

  select invoice_prefix || '-S-' || lpad(v_n::text, 5, '0')
  into v_invoice from shops where id = v_shop;

  insert into sales (id, shop_id, customer_id, invoice_no, note, total, discount, paid, created_by)
  values (v_sale_id, v_shop, p_customer_id, v_invoice, coalesce(p_note,''), 0, coalesce(p_discount,0), coalesce(p_paid,0), auth.uid());

  for v_item in select * from jsonb_array_elements(p_items)
  loop
    select * into v_part from parts where id = (v_item->>'part_id')::uuid;
    v_price := (v_item->>'sell_price')::numeric;
    v_line_id := gen_random_uuid();

    if v_item->>'unique_code' is not null and v_item->>'unique_code' <> '' then
      select * into v_unit from stock_units
      where shop_id = v_shop and unique_code = v_item->>'unique_code'
      for update;
      if not found then raise exception 'code not found'; end if;
      if v_unit.status <> 'in_stock' then raise exception 'code not in stock'; end if;

      update stock_units
      set status = 'sold', sale_id = v_sale_id, sale_line_id = v_line_id,
          sell_price = v_price, updated_at = now()
      where id = v_unit.id;

      insert into sale_lines (id, sale_id, part_id, stock_unit_id, qty, sell_price, line_total, unique_code)
      values (v_line_id, v_sale_id, v_unit.part_id, v_unit.id, 1, v_price, v_price, v_unit.unique_code);

      update stock_balances set qty = qty - 1, updated_at = now()
      where shop_id = v_shop and part_id = v_unit.part_id;

      insert into stock_movements (
        shop_id, part_id, stock_unit_id, unique_code, movement_type, qty_delta, ref_type, ref_id, note, created_by
      ) values (
        v_shop, v_unit.part_id, v_unit.id, v_unit.unique_code, 'sale', -1, 'sale', v_sale_id, 'বিক্রি', auth.uid()
      );

      v_total := v_total + v_price;
    else
      v_qty := (v_item->>'qty')::int;
      select qty into v_bal from stock_balances
      where shop_id = v_shop and part_id = v_part.id for update;
      if coalesce(v_bal, 0) < v_qty then raise exception 'insufficient stock for %', v_part.name_bn; end if;

      insert into sale_lines (id, sale_id, part_id, qty, sell_price, line_total)
      values (v_line_id, v_sale_id, v_part.id, v_qty, v_price, v_qty * v_price);

      update stock_balances set qty = qty - v_qty, updated_at = now()
      where shop_id = v_shop and part_id = v_part.id;

      insert into stock_movements (
        shop_id, part_id, movement_type, qty_delta, ref_type, ref_id, note, created_by
      ) values (
        v_shop, v_part.id, 'sale', -v_qty, 'sale', v_sale_id, 'বিক্রি', auth.uid()
      );

      v_total := v_total + (v_qty * v_price);
    end if;
  end loop;

  update sales set total = v_total where id = v_sale_id;

  return jsonb_build_object('sale_id', v_sale_id, 'invoice_no', v_invoice, 'total', v_total);
end;
$$;

create or replace function public.process_return_serial(
  p_unique_code text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_unit stock_units%rowtype;
  v_ret_id uuid := gen_random_uuid();
begin
  select * into v_unit from stock_units
  where shop_id = v_shop and unique_code = p_unique_code
  for update;

  if not found then
    insert into returns (id, shop_id, unique_code, qty, reason, matched, created_by)
    values (v_ret_id, v_shop, p_unique_code, 1, coalesce(p_reason,''), false, auth.uid());
    raise exception 'serial not found in records';
  end if;

  if v_unit.status <> 'sold' then
    raise exception 'unit is not in sold status';
  end if;

  update stock_units
  set status = 'in_stock', sale_id = null, sale_line_id = null, sell_price = null, updated_at = now()
  where id = v_unit.id;

  update stock_balances set qty = qty + 1, updated_at = now()
  where shop_id = v_shop and part_id = v_unit.part_id;

  insert into returns (
    id, shop_id, sale_id, sale_line_id, part_id, stock_unit_id, unique_code, qty, reason, matched, created_by
  ) values (
    v_ret_id, v_shop, v_unit.sale_id, v_unit.sale_line_id, v_unit.part_id, v_unit.id,
    v_unit.unique_code, 1, coalesce(p_reason,''), true, auth.uid()
  );

  insert into stock_movements (
    shop_id, part_id, stock_unit_id, unique_code, movement_type, qty_delta, ref_type, ref_id, note, created_by
  ) values (
    v_shop, v_unit.part_id, v_unit.id, v_unit.unique_code, 'return', 1, 'return', v_ret_id, coalesce(p_reason,'রিটার্ন'), auth.uid()
  );

  return jsonb_build_object('return_id', v_ret_id, 'matched', true, 'unique_code', v_unit.unique_code);
end;
$$;

grant execute on function public.receive_purchase(uuid, text, jsonb) to authenticated;
grant execute on function public.complete_sale(uuid, text, numeric, numeric, jsonb) to authenticated;
grant execute on function public.process_return_serial(text, text) to authenticated;
