-- Upload foto produk: bucket Storage publik + izin tulis hanya untuk admin.
-- Jalankan SEKALI di Supabase > SQL Editor (aman dijalankan ulang).
-- Prasyarat: schema.sql (fungsi public.is_admin) sudah dijalankan.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-images', 'product-images', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin upload foto produk" on storage.objects;
drop policy if exists "admin hapus foto produk" on storage.objects;
create policy "admin upload foto produk" on storage.objects for insert to authenticated
  with check (bucket_id = 'product-images' and public.is_admin());
create policy "admin hapus foto produk" on storage.objects for delete to authenticated
  using (bucket_id = 'product-images' and public.is_admin());
-- Membaca foto: bucket publik, jadi URL gambar bisa dibuka siapa saja (diperlukan katalog).
