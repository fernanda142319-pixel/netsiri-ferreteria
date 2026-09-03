-- MiniPOS Pro — Etapa 2: funciones de apoyo y políticas RLS
-- Ejecutar después de 0001_init_schema.sql

-- ── Función de apoyo: rol del usuario autenticado ───────────────────────
-- security definer: evita recursión de RLS al consultar la propia tabla profiles.
create or replace function public.current_role()
returns public.app_role
language sql
security definer
stable
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_management()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.current_role() in ('owner', 'admin');
$$;

-- ── Habilitar RLS ────────────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.products enable row level security;
alter table public.product_combos enable row level security;
alter table public.combo_items enable row level security;
alter table public.payment_methods enable row level security;
alter table public.cash_sessions enable row level security;
alter table public.sales enable row level security;
alter table public.sale_items enable row level security;
alter table public.cash_movements enable row level security;
alter table public.stock_movements enable row level security;
alter table public.settings enable row level security;

-- ── profiles ─────────────────────────────────────────────────────────────
create policy "profiles_select_own_or_management"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_management());

create policy "profiles_update_own_or_management"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_management());

-- ── categories ───────────────────────────────────────────────────────────
create policy "categories_select_all" on public.categories for select to authenticated using (true);
create policy "categories_write_management" on public.categories for all to authenticated
  using (public.is_management()) with check (public.is_management());

-- ── suppliers ────────────────────────────────────────────────────────────
create policy "suppliers_select_all" on public.suppliers for select to authenticated using (true);
create policy "suppliers_write_management" on public.suppliers for all to authenticated
  using (public.is_management()) with check (public.is_management());

-- ── products ─────────────────────────────────────────────────────────────
create policy "products_select_all" on public.products for select to authenticated using (true);
create policy "products_write_management_or_warehouse" on public.products for all to authenticated
  using (public.current_role() in ('owner', 'admin', 'warehouse'))
  with check (public.current_role() in ('owner', 'admin', 'warehouse'));

-- ── product_combos / combo_items ────────────────────────────────────────
create policy "combos_select_all" on public.product_combos for select to authenticated using (true);
create policy "combos_write_management" on public.product_combos for all to authenticated
  using (public.is_management()) with check (public.is_management());

create policy "combo_items_select_all" on public.combo_items for select to authenticated using (true);
create policy "combo_items_write_management" on public.combo_items for all to authenticated
  using (public.is_management()) with check (public.is_management());

-- ── payment_methods ──────────────────────────────────────────────────────
create policy "payment_methods_select_all" on public.payment_methods for select to authenticated using (true);
create policy "payment_methods_write_management" on public.payment_methods for all to authenticated
  using (public.is_management()) with check (public.is_management());

-- ── cash_sessions ────────────────────────────────────────────────────────
create policy "cash_sessions_select_all" on public.cash_sessions for select to authenticated using (true);
create policy "cash_sessions_insert_staff" on public.cash_sessions for insert to authenticated
  with check (opened_by = auth.uid() or public.is_management());
create policy "cash_sessions_update_owner_or_management" on public.cash_sessions for update to authenticated
  using (opened_by = auth.uid() or public.is_management());

-- ── sales / sale_items ───────────────────────────────────────────────────
create policy "sales_select_all" on public.sales for select to authenticated using (true);
create policy "sales_insert_staff" on public.sales for insert to authenticated
  with check (user_id = auth.uid() or public.is_management());
create policy "sales_update_management" on public.sales for update to authenticated
  using (public.is_management());

create policy "sale_items_select_all" on public.sale_items for select to authenticated using (true);
create policy "sale_items_insert_staff" on public.sale_items for insert to authenticated
  with check (
    exists (
      select 1 from public.sales s
      where s.id = sale_id and (s.user_id = auth.uid() or public.is_management())
    )
  );

-- ── cash_movements ───────────────────────────────────────────────────────
create policy "cash_movements_select_all" on public.cash_movements for select to authenticated using (true);
create policy "cash_movements_insert_staff" on public.cash_movements for insert to authenticated
  with check (created_by = auth.uid() or public.is_management());

-- ── stock_movements ──────────────────────────────────────────────────────
create policy "stock_movements_select_all" on public.stock_movements for select to authenticated using (true);
create policy "stock_movements_insert_staff" on public.stock_movements for insert to authenticated
  with check (
    public.current_role() in ('owner', 'admin', 'warehouse')
    and created_by = auth.uid()
  );

-- ── settings ─────────────────────────────────────────────────────────────
create policy "settings_select_all" on public.settings for select to authenticated using (true);
create policy "settings_write_owner" on public.settings for all to authenticated
  using (public.current_role() = 'owner') with check (public.current_role() = 'owner');
