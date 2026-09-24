-- Per-shop mutation rate limits (abuse / double-submit protection)
-- Run once in Supabase SQL Editor after setup.sql (or with new projects include via migrate).

create table if not exists shop_rate_buckets (
  shop_id uuid not null references shops(id) on delete cascade,
  action text not null,
  window_start timestamptz not null default now(),
  hit_count int not null default 0,
  primary key (shop_id, action)
);

alter table shop_rate_buckets enable row level security;

-- No direct client access; only via security definer RPC
drop policy if exists shop_rate_buckets_deny on shop_rate_buckets;
create policy shop_rate_buckets_deny on shop_rate_buckets
  for all using (false);

create or replace function public.assert_shop_rate(
  p_action text,
  p_max int default 30,
  p_window_sec int default 60
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_shop uuid := public.current_shop_id();
  v_start timestamptz;
  v_count int;
  v_now timestamptz := now();
begin
  if v_shop is null then
    raise exception 'shop not found for user';
  end if;
  if p_action is null or length(trim(p_action)) = 0 then
    raise exception 'rate action required';
  end if;
  if p_max < 1 then p_max := 1; end if;
  if p_window_sec < 5 then p_window_sec := 5; end if;

  insert into shop_rate_buckets (shop_id, action, window_start, hit_count)
  values (v_shop, p_action, v_now, 0)
  on conflict (shop_id, action) do nothing;

  select window_start, hit_count
  into v_start, v_count
  from shop_rate_buckets
  where shop_id = v_shop and action = p_action
  for update;

  if v_start + make_interval(secs => p_window_sec) <= v_now then
    update shop_rate_buckets
    set window_start = v_now, hit_count = 1
    where shop_id = v_shop and action = p_action;
    return;
  end if;

  if v_count >= p_max then
    raise exception 'rate limit exceeded'
      using errcode = 'P0001';
  end if;

  update shop_rate_buckets
  set hit_count = hit_count + 1
  where shop_id = v_shop and action = p_action;
end;
$$;

revoke all on function public.assert_shop_rate(text, int, int) from public;
grant execute on function public.assert_shop_rate(text, int, int) to authenticated;
