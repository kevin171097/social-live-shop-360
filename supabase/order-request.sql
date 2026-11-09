-- KD.LIVE: solicitudes de pedido seguras (sin cobro ni reserva de stock).
-- Ejecutar en Supabase SQL Editor después de schema.sql.

create or replace function public.create_order_request(
  p_product_id uuid,
  p_quantity integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_buyer_id uuid := auth.uid();
  v_product public.products%rowtype;
  v_order_id uuid;
begin
  if v_buyer_id is null then
    raise exception 'Iniciá sesión para solicitar un pedido';
  end if;

  if p_quantity is null or p_quantity < 1 or p_quantity > 99 then
    raise exception 'La cantidad debe estar entre 1 y 99';
  end if;

  select * into v_product
  from public.products
  where id = p_product_id
    and status = 'active'
  for share;

  if not found then
    raise exception 'El producto no está disponible';
  end if;

  if v_product.stock < p_quantity then
    raise exception 'No hay suficiente stock disponible';
  end if;

  if v_product.seller_id = v_buyer_id then
    raise exception 'No podés solicitar tu propio producto';
  end if;

  insert into public.orders (
    buyer_id, seller_id, product_id, quantity, unit_price, currency, status
  ) values (
    v_buyer_id, v_product.seller_id, v_product.id, p_quantity,
    v_product.price, v_product.currency, 'pending'
  ) returning id into v_order_id;

  return v_order_id;
end;
$$;

revoke all on function public.create_order_request(uuid, integer) from public;
grant execute on function public.create_order_request(uuid, integer) to authenticated;

-- El alta de pedidos se realiza exclusivamente mediante la función validada.
drop policy if exists "buyer creates own order" on public.orders;
