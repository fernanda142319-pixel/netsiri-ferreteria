-- MiniPOS Pro — Etapa 5: registrar una venta de forma atómica.
-- Crea la venta, sus items, descuenta stock (con movimiento registrado) y
-- registra el ingreso en caja, todo en una sola transacción.
--
-- SECURITY DEFINER: un Cajero no tiene permiso directo para UPDATE en
-- products ni INSERT en stock_movements (eso queda reservado a
-- owner/admin/warehouse vía RLS), pero SÍ necesita poder vender. Esta función
-- actúa como una API angosta y controlada: solo permite los cambios exactos
-- de una venta, no acceso arbitrario a esas tablas.

create or replace function public.create_sale(
  p_cash_session_id uuid,
  p_items jsonb,
  p_discount numeric default 0,
  p_payment_method public.payment_method_type default 'cash',
  p_allow_negative_stock boolean default false
)
returns public.sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_sale public.sales;
  v_item jsonb;
  v_product_id uuid;
  v_quantity numeric;
  v_unit_price numeric;
  v_total numeric := 0;
  v_previous_stock integer;
  v_new_stock integer;
begin
  if jsonb_array_length(p_items) = 0 then
    raise exception 'La venta no tiene productos';
  end if;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_total := v_total + (v_item ->> 'quantity')::numeric * (v_item ->> 'unitPrice')::numeric;
  end loop;
  v_total := greatest(v_total - p_discount, 0);

  insert into public.sales (user_id, cash_session_id, total, discount, payment_method, payment_status, status)
  values (auth.uid(), p_cash_session_id, v_total, p_discount, p_payment_method, 'paid', 'completed')
  returning * into v_sale;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_product_id := (v_item ->> 'productId')::uuid;
    v_quantity := (v_item ->> 'quantity')::numeric;
    v_unit_price := (v_item ->> 'unitPrice')::numeric;

    insert into public.sale_items (sale_id, product_id, quantity, unit_price, subtotal)
    values (v_sale.id, v_product_id, v_quantity, v_unit_price, v_quantity * v_unit_price);

    select stock into v_previous_stock from public.products where id = v_product_id for update;

    if v_previous_stock is null then
      raise exception 'Producto no encontrado: %', v_product_id;
    end if;

    v_new_stock := v_previous_stock - v_quantity::integer;

    if v_new_stock < 0 and not p_allow_negative_stock then
      raise exception 'Stock insuficiente para el producto %', v_product_id;
    end if;

    update public.products set stock = v_new_stock where id = v_product_id;

    insert into public.stock_movements
      (product_id, type, quantity, previous_stock, new_stock, reason, created_by)
    values
      (v_product_id, 'sale', v_quantity::integer, v_previous_stock, v_new_stock, 'Venta ' || v_sale.id, auth.uid());
  end loop;

  insert into public.cash_movements (cash_session_id, type, amount, description, created_by)
  values (p_cash_session_id, 'sale', v_total, 'Venta ' || v_sale.id, auth.uid());

  return v_sale;
end;
$$;

grant execute on function public.create_sale(uuid, jsonb, numeric, public.payment_method_type, boolean) to authenticated;
