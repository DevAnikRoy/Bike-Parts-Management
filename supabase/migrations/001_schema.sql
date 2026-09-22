-- Bike Parts Management — core schema (multi-tenant ready)
-- Run in Supabase SQL editor or via CLI migrations

create extension if not exists "pgcrypto";

create table if not exists shops (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text not null default '',
  phone text not null default '',
  invoice_prefix text not null default 'BPM',
  created_at timestamptz not null default now()
);

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
