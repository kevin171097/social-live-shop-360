-- KD.LIVE: almacenamiento de imágenes públicas de productos.
-- Ejecutar una vez en Supabase SQL Editor después de schema.sql.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images','product-images',true,5242880,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set public=true,file_size_limit=5242880,allowed_mime_types=array['image/jpeg','image/png','image/webp'];

drop policy if exists "Product images are publicly readable" on storage.objects;
create policy "Product images are publicly readable" on storage.objects for select using (bucket_id='product-images');

drop policy if exists "Sellers upload own product images" on storage.objects;
create policy "Sellers upload own product images" on storage.objects for insert to authenticated
with check (bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text
and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('seller','admin')));

drop policy if exists "Sellers update own product images" on storage.objects;
create policy "Sellers update own product images" on storage.objects for update to authenticated
using (bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text
and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('seller','admin')))
with check (bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text
and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('seller','admin')));

drop policy if exists "Sellers delete own product images" on storage.objects;
create policy "Sellers delete own product images" on storage.objects for delete to authenticated
using (bucket_id='product-images' and (storage.foldername(name))[1]=auth.uid()::text
and exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('seller','admin')));
