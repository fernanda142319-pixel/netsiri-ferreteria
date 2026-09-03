# Cómo dejar tu proyecto Supabase listo para MiniPOS Pro

## 1. Ejecutar el esquema y los datos de ejemplo

En tu proyecto de Supabase, ve a **SQL Editor → New query** y ejecuta estos 3 archivos **en este orden**, uno por uno (pega el contenido completo y haz click en "Run"):

1. `supabase/migrations/0001_init_schema.sql` — crea las tablas y tipos.
2. `supabase/migrations/0002_rls_policies.sql` — activa seguridad por fila (RLS) y políticas por rol.
3. `supabase/seed.sql` — carga categorías, proveedores, productos y métodos de pago de ejemplo.

## 2. Crear las 4 cuentas demo

Ve a **Authentication → Users → Add user** y crea estas 4 cuentas. Marca **"Auto Confirm User"** en cada una para que no necesiten verificar correo. En el campo **User Metadata** (JSON) pega el contenido indicado — esto define el nombre y el rol automáticamente gracias al trigger `handle_new_user`.

| Email | Password | User Metadata (JSON) |
| --- | --- | --- |
| duenio@minipos.cl | demo1234 | `{"full_name": "Carolina Pérez", "role": "owner"}` |
| admin@minipos.cl | demo1234 | `{"full_name": "Felipe Rojas", "role": "admin"}` |
| cajero@minipos.cl | demo1234 | `{"full_name": "Daniela Soto", "role": "cashier"}` |
| bodega@minipos.cl | demo1234 | `{"full_name": "Matías Vidal", "role": "warehouse"}` |

Puedes verificar que cada una generó su fila en `public.profiles` con el rol correcto yendo a **Table Editor → profiles**.

## 3. Configurar las variables de entorno

En **Settings → API**, copia:
- **Project URL**
- **anon public key**

Y pégalas en `.env.local` (en la raíz de `minipos-pro/`, basado en `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
```

Reinicia `npm run dev` después de crear/editar `.env.local`.
