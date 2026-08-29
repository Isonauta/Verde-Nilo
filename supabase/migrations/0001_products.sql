-- Fase 1: catálogo de productos de Verde Nilo
-- Ejecutar en el SQL Editor de Supabase (Project > SQL Editor > New query).

create extension if not exists "pgcrypto";

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  price integer not null check (price >= 0), -- CLP, sin decimales
  images text[] not null default '{}',       -- URLs públicas en el bucket product-images
  product_type text,                          -- ej: 'bolso', 'accesorio'
  tags text[] not null default '{}',          -- ej: 'temporada', 'ofertas', 'nuevos_ingresos'
  status text not null default 'disponible' check (status in ('disponible', 'vendido', 'oculto')),
  featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists products_status_idx on public.products (status);
create index if not exists products_tags_idx on public.products using gin (tags);

-- Mantiene updated_at al día en cada edición desde el panel admin.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists products_set_updated_at on public.products;
create trigger products_set_updated_at
before update on public.products
for each row
execute function public.set_updated_at();

-- Row Level Security: la tienda pública solo lee productos disponibles;
-- solo un usuario autenticado (Isabel, dada de alta a mano en Authentication) puede escribir.
alter table public.products enable row level security;

drop policy if exists "public_read_available_products" on public.products;
create policy "public_read_available_products"
on public.products for select
to anon, authenticated
using (status = 'disponible');

drop policy if exists "admin_full_access_products" on public.products;
create policy "admin_full_access_products"
on public.products for all
to authenticated
using (true)
with check (true);
