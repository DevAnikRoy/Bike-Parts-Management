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

create policy shops_select on shops for select
  using (id = public.current_shop_id());

create policy shops_update on shops for update
  using (id = public.current_shop_id());

create policy profiles_select on profiles for select
  using (shop_id = public.current_shop_id());

create policy catalog_read_brands on brands for select to authenticated using (true);
create policy catalog_read_models on bike_models for select to authenticated using (true);
create policy catalog_read_cats on part_categories for select to authenticated using (true);
create policy catalog_read_parts on parts for select to authenticated using (true);
create policy catalog_read_compat on part_model_compatibility for select to authenticated using (true);

create policy suppliers_all on suppliers for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy customers_all on customers for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy purchases_all on purchases for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

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

create policy stock_balances_all on stock_balances for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy stock_units_all on stock_units for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy sales_all on sales for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

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

create policy returns_all on returns for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy movements_all on stock_movements for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());

create policy counters_all on shop_counters for all
  using (shop_id = public.current_shop_id())
  with check (shop_id = public.current_shop_id());
