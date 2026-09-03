# MiniPOS Pro

Sistema de punto de venta e inventario simplificado para negocios pequeños en Chile (minimarkets, botillerías, almacenes, kioscos). Inspirado en Odoo, pero mucho más simple, visual y rápido de usar.

## Estado del proyecto

🚧 **MVP en construcción por etapas.** Etapas 1 a 6 completas: estructura base, navegación, **autenticación real con Supabase**, base de datos con RLS, **inventario + proveedores con CRUD real**, **punto de venta con venta real**, **dashboard 100% conectado a datos reales**, y **módulo de caja completo** (ingresos/retiros manuales, cierre con efectivo contado vs. esperado, diferencia, ventas por cajero). Ver `Próximos pasos` abajo.

## Stack

- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS v4
- Supabase (Auth + PostgreSQL, con RLS por rol)
- lucide-react (íconos)

## Cómo correr el proyecto localmente

1. Crea un proyecto en [supabase.com](https://supabase.com) y ejecuta `supabase/00_full_setup.sql` en el SQL Editor (instrucciones detalladas en `supabase/SETUP.md`).
2. Ejecuta también, en orden: `supabase/migrations/0003_stock_functions.sql` (función `adjust_stock`), `0004_create_sale.sql` (función `create_sale`) y `0005_cash_sessions_policy_fix.sql` (permite que Cajero cierre la caja, no solo quien la abrió).
3. Crea las 4 cuentas demo en Authentication → Users (ver tabla abajo) y ajusta su `full_name`/`role` en Table Editor → profiles.
4. Copia `.env.local.example` a `.env.local` y completa con tu Project URL y anon/publishable key (Settings → API).
5. Instala dependencias y corre el proyecto:

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000). La ruta `/` redirige a `/login`. `proxy.ts` protege las rutas a nivel de servidor (verifica la sesión de Supabase en cada request).

### Cuentas demo (Supabase real)

```
Password para las 4: demo1234
```

| Rol | Correo |
| --- | --- |
| Dueño | duenio@minipos.cl |
| Administrador | admin@minipos.cl |
| Cajero | cajero@minipos.cl |
| Bodeguero | bodega@minipos.cl |

El login en `/login` ahora autentica de verdad contra Supabase Auth (`signInWithPassword`) y lee el rol desde la tabla `profiles`. Los botones de "cuentas demo" solo prellenan el correo/contraseña, no son un atajo sin backend.

**Todo el dashboard es real ahora** (sin datos mock): ventas del día, efectivo/tarjeta/transferencia, cantidad de ventas, producto más vendido y ganancia estimada se calculan en vivo desde `sales`/`sale_items`/`products`. "Bajo stock"/"sin stock" siguen leyendo `products` directamente.

**Restricciones por rol ya activas:** Cajero no ve ni puede entrar a Inventario/Proveedores/Reportes/Configuración. Bodeguero no ve ni puede entrar a Vender/Caja/Proveedores (solo *ver*, no editar, Proveedores). Solo Dueño/Administrador administran proveedores y ven el detalle de "ventas por cajero". Todo bloqueado tanto en el sidebar como por URL directa.

**Punto de venta (`/pos`) — venta real de extremo a extremo:** antes de vender, pide abrir una caja con un monto inicial. Al hacer clic en "Cobrar": registra la venta y sus items, descuenta el stock real de cada producto, registra el movimiento de stock (`type: sale`) y el ingreso en caja — todo en una sola transacción atómica (`create_sale`). Si algún producto vendido queda con stock bajo o se agota, se muestra una alerta en la confirmación. Cajero no puede vender más unidades de las que hay en stock (la función SQL lo rechaza igual si se intenta evadir desde el cliente); Dueño/Administrador pueden forzarlo.

**Caja (`/caja`) — módulo completo:** muestra quién abrió la caja y cuándo, efectivo esperado en vivo (monto inicial + ventas en efectivo + ingresos − retiros), desglose de ventas por medio de pago, permite registrar ingresos/retiros manuales con motivo, y cerrar la caja pidiendo el efectivo contado — calcula la diferencia automáticamente (verde si sobra, rojo si falta) y vuelve a pedir abrir una caja nueva para el siguiente turno. Dueño/Administrador además ven el desglose de "ventas por cajero" (oculto para Cajero, ya que requeriría ver nombres de otros usuarios).

## Estructura del proyecto

```
app/
  (auth)/login/        Pantalla de login
  (app)/                Rutas protegidas (sidebar + topbar)
    dashboard/          Resumen del negocio
    pos/                Punto de venta real: carrito, abrir caja, cobrar (create_sale)
    inventario/         Lista, filtros y CRUD real de productos
    inventario/nuevo/   Crear producto
    inventario/[id]/    Editar producto + movimientos de stock
    caja/               Caja completa: resumen en vivo, ingresos/retiros, cierre con diferencia
    reportes/           Reportes (placeholder, Etapa 7)
    proveedores/        CRUD real de proveedores + productos asociados
    configuracion/      Configuración (placeholder, Etapa 8)
components/
  ui/                   Button, Card, Badge, Input, Select, Modal
  layout/               Sidebar, Topbar, RoleGate, ComingSoon
  dashboard/            SummaryCard, StockAlertList
  inventory/            ProductForm, ProductFilters, ProductTable, StockMovementPanel
  suppliers/            SupplierFormModal
  pos/                  CategoryBar, ProductCard, ProductGrid, Cart
  cash/                 OpenCashSessionForm, CashMovementForm, CloseCashModal
lib/
  auth/                 AuthProvider (Supabase Auth real) y roles
  supabase/             Clientes browser/server, lógica de proxy.ts, mappers de filas a tipos
  services/             products, categories, suppliers, cashSessions, sales, profiles
  mock/                 Solo queda users.ts (cuentas demo del login)
  utils/                Formato de moneda CLP, helper de clases y colores por categoría
hooks/
  useCart.ts            Estado del carrito: agregar, +/-, límite de stock, descuento, totales
types/                  Tipos de dominio (Product, Sale, CashSession, etc.) y database.types.ts
supabase/
  00_full_setup.sql     Script único: esquema + RLS + datos demo
  migrations/           0003 (adjust_stock), 0004 (create_sale), 0005 (policy fix de caja)
  SETUP.md              Instrucciones paso a paso para configurar el proyecto Supabase
proxy.ts                Protección de rutas a nivel servidor (equivalente a middleware en Next 16)
```

## Roles

| Rol | Acceso previsto |
| --- | --- |
| Dueño | Acceso completo |
| Administrador | Ventas, caja, inventario, proveedores, reportes |
| Cajero | Vender, abrir/cerrar caja |
| Bodeguero | Productos, stock, entradas de mercadería |

Todas las restricciones de esta tabla ya están activas en Vender/Inventario/Caja/Proveedores. Lo que falta (Reportes, Configuración) usará el mismo componente `RoleGate`.

## Próximos pasos (etapas siguientes)

- **Etapa 7:** Reportes y exportación a CSV/Excel.
- **Etapa 8:** Pulido final de diseño y responsive.
