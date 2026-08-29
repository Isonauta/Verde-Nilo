-- Fase 4: registro de pagos de Mercado Pago.
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor > New query),
-- después de 0001_products.sql y 0002_storage.sql.

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references public.products(id) on delete set null,
  product_name text not null,
  amount integer not null,
  mp_preference_id text,
  mp_payment_id text unique,
  status text not null default 'pendiente' check (status in ('pendiente', 'aprobado', 'rechazado')),
  buyer_name text,
  buyer_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_created_at_idx on public.orders (created_at desc);

-- Reutiliza la función set_updated_at() creada en 0001_products.sql.
drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute function public.set_updated_at();

-- Row Level Security: nadie del público puede leer ni escribir pedidos
-- directamente. Solo las funciones serverless (con la service role key, que
-- ignora RLS) y el panel admin (Isabel autenticada) acceden a esta tabla.
alter table public.orders enable row level security;

drop policy if exists "admin_full_access_orders" on public.orders;
create policy "admin_full_access_orders"
on public.orders for all
to authenticated
using (true)
with check (true);
