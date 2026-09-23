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
