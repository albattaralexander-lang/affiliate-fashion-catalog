# Affiliate Fashion Catalog (BOYS.SEE_ / GIRLS.SEE_)
Frontend statis (HTML/CSS/JS) + Supabase (database, login admin). Tanpa library tambahan.

**Sudah punya tabel dari versi lama?** Jalankan `supabase/migrasi-1.sql` sekali di SQL Editor (jangan jalankan schema.sql lagi).

## Mode demo
Biarkan `js/config.js` kosong, lalu buka `index.html` (atau `python3 -m http.server`). Katalog memakai `data/products.js` (DEMO).

## Mengaktifkan database dan dashboard (langkah manual, butuh akun kamu)
1. Buat project di supabase.com.
2. SQL Editor: jalankan seluruh isi `supabase/schema.sql`.
3. Authentication > Providers > Email: **matikan "Allow new users to sign up"**.
4. Authentication > Users: tambah 1 user (email + kata sandi) untuk dirimu.
5. SQL Editor: jalankan baris `insert into public.admin_users ...` di akhir schema.sql (ganti emailnya).
6. Project Settings > API: salin **Project URL** dan **anon public key** ke `js/config.js`. Jangan pernah memakai service_role key.
7. Buka `/admin/`, masuk, tambah produk (nomor, nama, URL affiliate Shopee, URL gambar), ubah status ke Terbit.
8. **Upload foto:** SQL Editor, jalankan seluruh isi `supabase/storage.sql` sekali (membuat bucket publik `product-images` + izin upload/hapus hanya untuk admin). Setelah itu di form produk pilih file foto (JPG/PNG/WebP). Foto otomatis dikecilkan (maks 1200px, JPEG) lalu diunggah saat klik Simpan. Kolom URL gambar tetap bisa dipakai sebagai alternatif.
