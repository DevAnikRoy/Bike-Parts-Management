-- Bike Parts Management
-- Run this whole file ONCE in the Supabase SQL Editor.
-- Do not also run the files in supabase/migrations one by one.
-- Phone SMS is not used. Each email gets its own shop.

-- Bike Parts Management — core schema (multi-tenant ready)
-- Run in Supabase SQL editor or via CLI migrations

create extension if not exists "pgcrypto";

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  phone text not null default '',
  invoice_prefix text not null default 'BPM',
  logo_svg text,
  created_at timestamptz not null default now()
);

alter table shops add column if not exists logo_svg text;

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  phone text not null default '',
  role text not null check (role in ('owner', 'staff')) default 'owner',
  created_at timestamptz not null default now()
);

create table if not exists brands (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_bn text not null
);

create table if not exists bike_models (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid not null references brands(id) on delete cascade,
  name text not null,
  name_bn text not null,
  cc int not null default 0,
  year_from int not null default 2010,
  active boolean not null default true
);

create table if not exists part_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  name_bn text not null,
  sort_order int not null default 0
);

create table if not exists parts (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brands(id) on delete set null,
  category_id uuid not null references part_categories(id),
  name text not null,
  name_bn text not null,
  oem_part_no text not null,
  tracking_mode text not null check (tracking_mode in ('serialized', 'optional_serial', 'qty_only')),
  default_buy_price numeric(12,2) not null default 0,
  default_sell_price numeric(12,2) not null default 0,
  reorder_level int not null default 0,
  unit text not null default 'পিস'
);

create unique index if not exists parts_oem_idx on parts (oem_part_no);

create table if not exists part_model_compatibility (
  part_id uuid not null references parts(id) on delete cascade,
  model_id uuid not null references bike_models(id) on delete cascade,
  primary key (part_id, model_id)
);

create table if not exists suppliers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  phone text not null default '',
  address text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists customers (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  name text not null,
  phone text not null default '',
  address text not null default '',
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists purchases (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  supplier_id uuid references suppliers(id) on delete set null,
  invoice_no text not null,
  note text not null default '',
  total numeric(12,2) not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists purchase_lines (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  part_id uuid not null references parts(id),
  qty int not null check (qty > 0),
  buy_price numeric(12,2) not null,
  line_total numeric(12,2) not null
);

create table if not exists stock_balances (
  shop_id uuid not null references shops(id) on delete cascade,
  part_id uuid not null references parts(id) on delete cascade,
  qty numeric(12,3) not null default 0,
  avg_buy_price numeric(12,2) not null default 0,
  sell_price numeric(12,2) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (shop_id, part_id)
);

create table if not exists sales (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  customer_id uuid references customers(id) on delete set null,
  invoice_no text not null,
  note text not null default '',
  total numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  paid numeric(12,2) not null default 0,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists sale_lines (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references sales(id) on delete cascade,
  part_id uuid not null references parts(id),
  stock_unit_id uuid,
  qty int not null check (qty > 0),
  sell_price numeric(12,2) not null,
  line_total numeric(12,2) not null,
  unique_code text
);

create table if not exists stock_units (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  part_id uuid not null references parts(id),
  unique_code text not null,
  status text not null check (status in ('in_stock', 'sold', 'returned', 'warranty', 'damaged')),
  purchase_id uuid references purchases(id) on delete set null,
  purchase_line_id uuid references purchase_lines(id) on delete set null,
  sale_id uuid references sales(id) on delete set null,
  sale_line_id uuid references sale_lines(id) on delete set null,
  buy_price numeric(12,2) not null default 0,
  sell_price numeric(12,2),
  warranty_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (shop_id, unique_code)
);

alter table sale_lines
  drop constraint if exists sale_lines_stock_unit_id_fkey;
alter table sale_lines
  add constraint sale_lines_stock_unit_id_fkey
  foreign key (stock_unit_id) references stock_units(id) on delete set null;

create table if not exists returns (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  sale_id uuid references sales(id) on delete set null,
  sale_line_id uuid references sale_lines(id) on delete set null,
  part_id uuid references parts(id),
  stock_unit_id uuid references stock_units(id) on delete set null,
  unique_code text,
  qty int not null default 1,
  reason text not null default '',
  matched boolean not null default false,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists stock_movements (
  id uuid primary key default gen_random_uuid(),
  shop_id uuid not null references shops(id) on delete cascade,
  part_id uuid not null references parts(id),
  stock_unit_id uuid references stock_units(id) on delete set null,
  unique_code text,
  movement_type text not null check (movement_type in ('purchase', 'sale', 'return', 'adjust', 'warranty')),
  qty_delta numeric(12,3) not null,
  ref_type text not null,
  ref_id uuid,
  note text not null default '',
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists shop_counters (
  shop_id uuid primary key references shops(id) on delete cascade,
  purchase_n int not null default 0,
  sale_n int not null default 0
);

create index if not exists stock_units_code_idx on stock_units (unique_code);
create index if not exists stock_units_status_idx on stock_units (shop_id, status);
create index if not exists movements_part_idx on stock_movements (shop_id, part_id, created_at desc);


-- Row Level Security: users only see their shop's data

alter table shops enable row level security;
alter table profiles enable row level security;
alter table suppliers enable row level security;
alter table customers enable row level security;
alter table purchases enable row level security;
alter table purchase_lines enable row level security;
alter table stock_balances enable row level security;
alter table stock_units enable row level security;
alter table sales enable row level security;
alter table sale_lines enable row level security;
alter table returns enable row level security;
alter table stock_movements enable row level security;
alter table shop_counters enable row level security;

-- Catalog tables are readable by authenticated users
alter table brands enable row level security;
alter table bike_models enable row level security;
alter table part_categories enable row level security;
alter table parts enable row level security;
alter table part_model_compatibility enable row level security;

create or replace function public.current_shop_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select shop_id from profiles where id = auth.uid()
$$;

drop policy if exists shops_select on shops;
create policy shops_select on shops for select
  using (id = public.current_shop_id());

drop policy if exists shops_update on shops;
create policy shops_update on shops for update
  using (id = public.current_shop_id());

drop policy if exists profiles_select on profiles;
create policy profiles_select on profiles for select
  using (shop_id = public.current_shop_id());

drop policy if exists catalog_read_brands on brands;
create policy catalog_read_brands on brands for select to authenticated using (true);
drop policy if exists catalog_read_models on bike_models;
create policy catalog_read_models on bike_models for select to authenticated using (true);
drop policy if exists catalog_read_cats on part_categories;
create policy catalog_read_cats on part_categories for select to authenticated using (true);
drop policy if exists catalog_read_parts on parts;
create policy catalog_read_parts on parts for select to authenticated using (true);
drop policy if exists catalog_read_compat on part_model_compatibility;
create policy catalog_read_compat on part_model_compatibility for select to authenticated using (true);

drop policy if exists suppliers_all on suppliers;
create policy suppliers_all on suppliers for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists customers_all on customers;
create policy customers_all on customers for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists purchases_all on purchases;
create policy purchases_all on purchases for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists purchase_lines_all on purchase_lines;
create policy purchase_lines_all on purchase_lines for all
  using (
    exists (
      select 1 from purchases p
      where p.id = purchase_id and p.shop_id = public.current_shop_id()
    )
  )
  with check (
    exists (
      select 1 from purchases p
      where p.id = purchase_id and p.shop_id = public.current_shop_id()
    )
  );

drop policy if exists stock_balances_all on stock_balances;
create policy stock_balances_all on stock_balances for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists stock_units_all on stock_units;
create policy stock_units_all on stock_units for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists sales_all on sales;
create policy sales_all on sales for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists sale_lines_all on sale_lines;
create policy sale_lines_all on sale_lines for all
  using (
    exists (
      select 1 from sales s
      where s.id = sale_id and s.shop_id = public.current_shop_id()
    )
  )
  with check (
    exists (
      select 1 from sales s
      where s.id = sale_id and s.shop_id = public.current_shop_id()
    )
  );

drop policy if exists returns_all on returns;
create policy returns_all on returns for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists movements_all on stock_movements;
create policy movements_all on stock_movements for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

drop policy if exists counters_all on shop_counters;
create policy counters_all on shop_counters for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());


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

  begin
    insert into shops (name, address, phone, invoice_prefix)
    values ('আমার বাইক পার্টস', '', '', 'BPM')
    returning id into v_shop;

    insert into profiles (id, shop_id, name, phone, role)
    values (v_uid, v_shop, v_name, '', 'owner');

    insert into shop_counters (shop_id, purchase_n, sale_n)
    values (v_shop, 0, 0)
    on conflict (shop_id) do nothing;

    return jsonb_build_object('shop_id', v_shop, 'created', true);
  exception
    when unique_violation then
      select shop_id into v_shop from profiles where id = v_uid;
      if v_shop is null then
        raise;
      end if;
      return jsonb_build_object('shop_id', v_shop, 'created', false);
  end;
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


