-- MiniPOS Pro — Etapa 3: función para registrar entradas/salidas de stock
-- de forma atómica (actualiza products.stock + inserta stock_movements).
-- Ejecutar en SQL Editor (incremental, no requiere repetir 00_full_setup.sql).

create or replace function public.adjust_stock(
  p_product_id uuid,
  p_type public.stock_movement_type,
  p_quantity integer,
  p_reason text default ''
)
returns public.products
language plpgsql
as $$
declare
  v_previous_stock integer;
  v_new_stock integer;
  v_product public.products;
begin
  select stock into v_previous_stock from public.products where id = p_product_id for update;

  if v_previous_stock is null then
    raise exception 'Producto no encontrado: %', p_product_id;
  end if;

  if p_type = 'in' then
    v_new_stock := v_previous_stock + p_quantity;
  elsif p_type = 'out' then
    v_new_stock := v_previous_stock - p_quantity;
  else
    raise exception 'adjust_stock solo admite tipo in/out, recibido: %', p_type;
  end if;

  if v_new_stock < 0 then
    raise exception 'Stock insuficiente: la salida dejaría % unidades', v_new_stock;
  end if;

  update public.products
  set stock = v_new_stock
  where id = p_product_id
  returning * into v_product;

  insert into public.stock_movements
    (product_id, type, quantity, previous_stock, new_stock, reason, created_by)
  values
    (p_product_id, p_type, p_quantity, v_previous_stock, v_new_stock, p_reason, auth.uid());

  return v_product;
end;
$$;

grant execute on function public.adjust_stock(uuid, public.stock_movement_type, integer, text) to authenticated;
