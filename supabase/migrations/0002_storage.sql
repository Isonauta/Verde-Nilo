-- Fase 1: bucket de imágenes de productos
-- Ejecutar después de 0001_products.sql.

insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

drop policy if exists "public_read_product_images" on storage.objects;
create policy "public_read_product_images"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'product-images');

drop policy if exists "admin_upload_product_images" on storage.objects;
create policy "admin_upload_product_images"
on storage.objects for insert
to authenticated
with check (bucket_id = 'product-images');

drop policy if exists "admin_update_product_images" on storage.objects;
create policy "admin_update_product_images"
on storage.objects for update
to authenticated
using (bucket_id = 'product-images');

drop policy if exists "admin_delete_product_images" on storage.objects;
create policy "admin_delete_product_images"
on storage.objects for delete
to authenticated
using (bucket_id = 'product-images');
