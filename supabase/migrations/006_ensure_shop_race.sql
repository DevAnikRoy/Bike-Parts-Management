-- Harden ensure_my_shop against concurrent first-login races.
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
