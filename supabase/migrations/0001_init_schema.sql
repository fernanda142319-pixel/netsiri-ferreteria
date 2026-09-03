-- MiniPOS Pro — Etapa 2: esquema inicial
-- Ejecutar este archivo completo en Supabase: Dashboard > SQL Editor > New query > Run.

create extension if not exists "pgcrypto";

-- ── Enums ────────────────────────────────────────────────────────────────
create type public.app_role as enum ('owner', 'admin', 'cashier', 'warehouse');
create type public.unit_type as enum ('unit', 'weight');
create type public.payment_method_type as enum ('cash', 'card', 'transfer', 'mixed');
create type public.payment_status_type as enum ('paid', 'pending');
create type public.sale_status_type as enum ('completed', 'cancelled');
create type public.cash_session_status_type as enum ('open', 'closed');
create type public.cash_movement_type as enum ('income', 'withdrawal', 'sale');
create type public.stock_movement_type as enum ('in', 'out', 'sale', 'adjustment');

-- ── Tablas ───────────────────────────────────────────────────────────────

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

-- ── Trigger genérico para updated_at ────────────────────────────────────
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

-- ── Trigger: crear profile automáticamente al crear un usuario en Auth ──
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
