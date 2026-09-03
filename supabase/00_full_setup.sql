-- ============================================================================
-- MiniPOS Pro — Script único de configuración inicial de base de datos
-- Pégalo completo en: Supabase Dashboard > SQL Editor > New query > Run
-- Incluye: extensiones, tipos, tablas, triggers, seguridad (RLS) y datos demo.
-- ============================================================================

-- ── 1. Extensiones y tipos ───────────────────────────────────────────────
create extension if not exists "pgcrypto";

create type public.app_role as enum ('owner', 'admin', 'cashier', 'warehouse');
create type public.unit_type as enum ('unit', 'weight');
create type public.payment_method_type as enum ('cash', 'card', 'transfer', 'mixed');
create type public.payment_status_type as enum ('paid', 'pending');
create type public.sale_status_type as enum ('completed', 'cancelled');
create type public.cash_session_status_type as enum ('open', 'closed');
create type public.cash_movement_type as enum ('income', 'withdrawal', 'sale');
create type public.stock_movement_type as enum ('in', 'out', 'sale', 'adjustment');

-- ── 2. Tablas ────────────────────────────────────────────────────────────

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role public.app_role not null default 'cashier',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  icon text not null default '📦',
  color text not null default 'gray',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  rut text,
  phone text,
  email text,
  address text,
  contact_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  barcode text unique,
  category_id uuid references public.categories (id) on delete set null,
  image_url text not null default '',
  cost_price numeric(12, 2) not null default 0,
  sale_price numeric(12, 2) not null default 0,
  stock integer not null default 0,
  min_stock integer not null default 0,
  supplier_id uuid references public.suppliers (id) on delete set null,
  expiration_date date,
  unit_type public.unit_type not null default 'unit',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index products_category_id_idx on public.products (category_id);
create index products_barcode_idx on public.products (barcode);

create table public.product_combos (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sale_price numeric(12, 2) not null default 0,
  image_url text not null default '',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.combo_items (
  id uuid primary key default gen_random_uuid(),
  combo_id uuid not null references public.product_combos (id) on delete cascade,
  product_id uuid not null references public.products (id) on delete cascade,
  quantity integer not null default 1
);

create table public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  name public.payment_method_type not null unique,
  is_active boolean not null default true
);

create table public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  opened_by uuid not null references public.profiles (id),
  closed_by uuid references public.profiles (id),
  opening_amount numeric(12, 2) not null default 0,
  closing_amount numeric(12, 2),
  expected_cash numeric(12, 2),
  counted_cash numeric(12, 2),
  difference numeric(12, 2),
  status public.cash_session_status_type not null default 'open',
  opened_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.sales (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id),
  cash_session_id uuid not null references public.cash_sessions (id),
  total numeric(12, 2) not null default 0,
  discount numeric(12, 2) not null default 0,
  payment_method public.payment_method_type not null default 'cash',
  payment_status public.payment_status_type not null default 'paid',
  status public.sale_status_type not null default 'completed',
  created_at timestamptz not null default now()
);

create index sales_cash_session_id_idx on public.sales (cash_session_id);
create index sales_created_at_idx on public.sales (created_at);

create table public.sale_items (
  id uuid primary key default gen_random_uuid(),
  sale_id uuid not null references public.sales (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity numeric(12, 2) not null default 1,
  unit_price numeric(12, 2) not null default 0,
  subtotal numeric(12, 2) not null default 0
);

create index sale_items_sale_id_idx on public.sale_items (sale_id);

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  cash_session_id uuid not null references public.cash_sessions (id) on delete cascade,
  type public.cash_movement_type not null,
  amount numeric(12, 2) not null,
  description text not null default '',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index cash_movements_session_id_idx on public.cash_movements (cash_session_id);

create table public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id),
  type public.stock_movement_type not null,
  quantity integer not null,
  previous_stock integer not null,
  new_stock integer not null,
  reason text not null default '',
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create index stock_movements_product_id_idx on public.stock_movements (product_id);

create table public.settings (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Mi Negocio',
  logo_url text,
  currency text not null default 'CLP',
  default_min_stock integer not null default 5,
  address text not null default '',
  phone text not null default '',
  updated_at timestamptz not null default now()
);

-- ── 3. Triggers ──────────────────────────────────────────────────────────

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Crea automáticamente una fila en "profiles" cuando se crea un usuario en
-- Authentication. El nombre y el rol se toman desde "User Metadata" (JSON)
-- al crear el usuario; si no se especifican, el rol por defecto es "cashier".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    coalesce((new.raw_user_meta_data ->> 'role')::public.app_role, 'cashier')
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── 4. Funciones de apoyo para seguridad por rol ────────────────────────

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

-- ── 5. Activar seguridad por fila (RLS) ─────────────────────────────────

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

-- profiles
create policy "profiles_select_own_or_management"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_management());

create policy "profiles_update_own_or_management"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_management());

-- categories
create policy "categories_select_all" on public.categories for select to authenticated using (true);
create policy "categories_write_management" on public.categories for all to authenticated
  using (public.is_management()) with check (public.is_management());

-- suppliers
create policy "suppliers_select_all" on public.suppliers for select to authenticated using (true);
create policy "suppliers_write_management" on public.suppliers for all to authenticated
  using (public.is_management()) with check (public.is_management());

-- products
create policy "products_select_all" on public.products for select to authenticated using (true);
create policy "products_write_management_or_warehouse" on public.products for all to authenticated
  using (public.current_role() in ('owner', 'admin', 'warehouse'))
  with check (public.current_role() in ('owner', 'admin', 'warehouse'));

-- product_combos / combo_items
create policy "combos_select_all" on public.product_combos for select to authenticated using (true);
create policy "combos_write_management" on public.product_combos for all to authenticated
  using (public.is_management()) with check (public.is_management());

create policy "combo_items_select_all" on public.combo_items for select to authenticated using (true);
create policy "combo_items_write_management" on public.combo_items for all to authenticated
  using (public.is_management()) with check (public.is_management());

-- payment_methods
create policy "payment_methods_select_all" on public.payment_methods for select to authenticated using (true);
create policy "payment_methods_write_management" on public.payment_methods for all to authenticated
  using (public.is_management()) with check (public.is_management());

-- cash_sessions
create policy "cash_sessions_select_all" on public.cash_sessions for select to authenticated using (true);
create policy "cash_sessions_insert_staff" on public.cash_sessions for insert to authenticated
  with check (opened_by = auth.uid() or public.is_management());
create policy "cash_sessions_update_staff" on public.cash_sessions for update to authenticated
  using (public.current_role() in ('owner', 'admin', 'cashier'));

-- sales / sale_items
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

-- cash_movements
create policy "cash_movements_select_all" on public.cash_movements for select to authenticated using (true);
create policy "cash_movements_insert_staff" on public.cash_movements for insert to authenticated
  with check (created_by = auth.uid() or public.is_management());

-- stock_movements
create policy "stock_movements_select_all" on public.stock_movements for select to authenticated using (true);
create policy "stock_movements_insert_staff" on public.stock_movements for insert to authenticated
  with check (
    public.current_role() in ('owner', 'admin', 'warehouse')
    and created_by = auth.uid()
  );

-- settings
create policy "settings_select_all" on public.settings for select to authenticated using (true);
create policy "settings_write_owner" on public.settings for all to authenticated
  using (public.current_role() = 'owner') with check (public.current_role() = 'owner');

-- ── 5b. Función para registrar entradas/salidas de stock atómicamente ───

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

-- ── 6. Datos de ejemplo (categorías, proveedores, productos, etc.) ──────

insert into public.categories (id, name, icon, color) values
  ('a0000000-0000-0000-0000-000000000001', 'Bebidas', '🥤', 'sky'),
  ('a0000000-0000-0000-0000-000000000002', 'Cervezas', '🍺', 'amber'),
  ('a0000000-0000-0000-0000-000000000003', 'Licores', '🥃', 'violet'),
  ('a0000000-0000-0000-0000-000000000004', 'Snacks', '🍪', 'orange'),
  ('a0000000-0000-0000-0000-000000000005', 'Abarrotes', '🛒', 'lime'),
  ('a0000000-0000-0000-0000-000000000006', 'Panadería', '🍞', 'yellow'),
  ('a0000000-0000-0000-0000-000000000007', 'Congelados', '🧊', 'cyan'),
  ('a0000000-0000-0000-0000-000000000008', 'Cigarrillos', '🚬', 'slate'),
  ('a0000000-0000-0000-0000-000000000009', 'Otros', '📦', 'gray');

insert into public.suppliers (id, name, rut, phone, email, address, contact_name) values
  ('b0000000-0000-0000-0000-000000000001', 'CCU Chile S.A.', '90.227.000-0', '+56 2 2427 3000', 'contacto@ccu.cl', 'Av. Vitacura 2670, Santiago', 'Marcela Soto'),
  ('b0000000-0000-0000-0000-000000000002', 'Embonor S.A.', '96.529.310-3', '+56 58 220 1000', 'ventas@embonor.cl', 'Av. Capitán Ávalos 6800, Arica', 'Pedro Salinas'),
  ('b0000000-0000-0000-0000-000000000003', 'Coca-Cola Andina', '91.144.000-8', '+56 2 2338 0520', 'contacto@koandina.com', 'Av. Miraflores 9153, Renca', 'Javiera Muñoz'),
  ('b0000000-0000-0000-0000-000000000004', 'Distribuidora Mayorista Ñuble', '77.345.210-5', '+56 9 8123 4567', 'ventas@distmayorista.cl', 'Camino a Talcahuano 450, Chillán', 'Rodrigo Fuentes');

insert into public.products
  (id, name, description, barcode, category_id, cost_price, sale_price, stock, min_stock, supplier_id, expiration_date, unit_type) values
  ('c0000000-0000-0000-0000-000000000001', 'Coca-Cola 1.5L', 'Bebida gaseosa 1.5 litros', '7800000000011', 'a0000000-0000-0000-0000-000000000001', 1100, 1800, 42, 12, 'b0000000-0000-0000-0000-000000000002', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000002', 'Fanta 1.5L', 'Bebida gaseosa sabor naranja 1.5 litros', '7800000000028', 'a0000000-0000-0000-0000-000000000001', 1100, 1800, 30, 12, 'b0000000-0000-0000-0000-000000000002', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000003', 'Sprite 1.5L', 'Bebida gaseosa sabor lima limón 1.5 litros', '7800000000035', 'a0000000-0000-0000-0000-000000000001', 1100, 1800, 8, 12, 'b0000000-0000-0000-0000-000000000002', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000004', 'Agua mineral', 'Agua mineral sin gas 1.5 litros', '7800000000042', 'a0000000-0000-0000-0000-000000000001', 500, 1000, 60, 15, 'b0000000-0000-0000-0000-000000000002', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000005', 'Red Bull 250 ml', 'Bebida energética lata 250 ml', '7800000000059', 'a0000000-0000-0000-0000-000000000001', 1400, 2200, 0, 10, 'b0000000-0000-0000-0000-000000000003', null, 'unit'),

  ('c0000000-0000-0000-0000-000000000006', 'Heineken lata', 'Cerveza lata 350 ml', '7800000000066', 'a0000000-0000-0000-0000-000000000002', 900, 1500, 36, 12, 'b0000000-0000-0000-0000-000000000001', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000007', 'Corona botella', 'Cerveza botella 355 ml', '7800000000073', 'a0000000-0000-0000-0000-000000000002', 1000, 1700, 24, 12, 'b0000000-0000-0000-0000-000000000001', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000008', 'Cristal lata', 'Cerveza lata 350 ml', '7800000000080', 'a0000000-0000-0000-0000-000000000002', 600, 1100, 5, 18, 'b0000000-0000-0000-0000-000000000001', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000009', 'Escudo lata', 'Cerveza lata 350 ml', '7800000000097', 'a0000000-0000-0000-0000-000000000002', 600, 1100, 28, 12, 'b0000000-0000-0000-0000-000000000001', null, 'unit'),

  ('c0000000-0000-0000-0000-000000000010', 'Pisco Alto del Carmen 35°', 'Pisco 35° 750 ml', '7800000000103', 'a0000000-0000-0000-0000-000000000003', 4200, 6500, 14, 5, 'b0000000-0000-0000-0000-000000000001', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000011', 'Pisco Mistral 35°', 'Pisco 35° 750 ml', '7800000000110', 'a0000000-0000-0000-0000-000000000003', 4500, 6900, 10, 5, 'b0000000-0000-0000-0000-000000000001', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000012', 'Ron Barceló', 'Ron añejo 750 ml', '7800000000127', 'a0000000-0000-0000-0000-000000000003', 7800, 11900, 6, 4, 'b0000000-0000-0000-0000-000000000002', null, 'unit'),
  ('c0000000-0000-0000-0000-000000000013', 'Vodka Absolut', 'Vodka 750 ml', '7800000000134', 'a0000000-0000-0000-0000-000000000003', 8200, 12500, 3, 4, 'b0000000-0000-0000-0000-000000000002', null, 'unit'),

  ('c0000000-0000-0000-0000-000000000014', 'Hielo 1 kg', 'Bolsa de hielo en cubos 1 kg', '7800000000141', 'a0000000-0000-0000-0000-000000000007', 700, 1500, 20, 10, 'b0000000-0000-0000-0000-000000000004', null, 'unit'),

  ('c0000000-0000-0000-0000-000000000015', 'Papas Lays', 'Papas fritas 130 g', '7800000000158', 'a0000000-0000-0000-0000-000000000004', 900, 1500, 32, 12, 'b0000000-0000-0000-0000-000000000004', '2026-09-15', 'unit'),
  ('c0000000-0000-0000-0000-000000000016', 'Ramitas', 'Snack de maíz 90 g', '7800000000165', 'a0000000-0000-0000-0000-000000000004', 500, 900, 18, 10, 'b0000000-0000-0000-0000-000000000004', '2026-08-01', 'unit'),
  ('c0000000-0000-0000-0000-000000000017', 'Chocolate Sahne-Nuss', 'Chocolate con maní 32 g', '7800000000172', 'a0000000-0000-0000-0000-000000000004', 350, 700, 50, 15, 'b0000000-0000-0000-0000-000000000004', '2026-12-01', 'unit'),

  ('c0000000-0000-0000-0000-000000000018', 'Pan corriente', 'Pan corriente por kilo', '7800000000189', 'a0000000-0000-0000-0000-000000000006', 1200, 2200, 9, 5, 'b0000000-0000-0000-0000-000000000004', '2026-06-26', 'weight'),

  ('c0000000-0000-0000-0000-000000000019', 'Leche Soprole', 'Leche entera 1 litro', '7800000000196', 'a0000000-0000-0000-0000-000000000005', 800, 1300, 26, 12, 'b0000000-0000-0000-0000-000000000004', '2026-07-10', 'unit'),
  ('c0000000-0000-0000-0000-000000000020', 'Azúcar 1 kg', 'Azúcar granulada 1 kg', '7800000000202', 'a0000000-0000-0000-0000-000000000005', 900, 1400, 22, 10, 'b0000000-0000-0000-0000-000000000004', null, 'unit'),

  ('c0000000-0000-0000-0000-000000000021', 'Cigarrillos Lucky Strike', 'Caja de 20 unidades', '7800000000219', 'a0000000-0000-0000-0000-000000000008', 3200, 4500, 40, 15, 'b0000000-0000-0000-0000-000000000004', null, 'unit');

insert into public.payment_methods (name) values
  ('cash'), ('card'), ('transfer'), ('mixed');

insert into public.settings (business_name, currency, default_min_stock, address, phone) values
  ('Mi Minimarket', 'CLP', 10, 'Av. Siempre Viva 123, Santiago', '+56 9 0000 0000');

-- ============================================================================
-- Fin del script. Si todo corrió sin errores, verás "Success. No rows returned"
-- en el SQL Editor. El siguiente paso es crear los 4 usuarios demo desde
-- Authentication > Users (ver instrucciones fuera de este script).
-- ============================================================================
