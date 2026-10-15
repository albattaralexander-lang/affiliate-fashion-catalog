-- Instalasi BARU saja. Jika tabel products sudah ada (versi lama), jalankan supabase/migrasi-1.sql.
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  number integer not null check (number > 0),
  brand text not null check (brand in ('boys','girls')),
  name text not null check (char_length(name) between 1 and 200),
  image_url text not null default '',
  affiliate_url text not null default '' check (affiliate_url = '' or affiliate_url ~* '^https?://'),
  status text not null default 'draft' check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (brand, number)
);

create or replace function public.set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists trg_products_updated on public.products;
create trigger trg_products_updated before update on public.products
  for each row execute function public.set_updated_at();

-- Daftar admin (tanpa kebijakan = tidak bisa dibaca/ditulis lewat API).
create table if not exists public.admin_users (user_id uuid primary key references auth.users(id) on delete cascade);
alter table public.admin_users enable row level security;

create or replace function public.is_admin() returns boolean
  language sql stable security definer set search_path = public as
  $$ select exists (select 1 from public.admin_users where user_id = auth.uid()) $$;

alter table public.products enable row level security;
drop policy if exists "publik baca terbit" on public.products;
drop policy if exists "admin kelola" on public.products;
create policy "publik baca terbit" on public.products for select to anon, authenticated
  using (status = 'published');
create policy "admin kelola" on public.products for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- SETELAH membuat user admin di Authentication > Users, jalankan (ganti emailnya):
-- insert into public.admin_users (user_id) select id from auth.users where email = 'EMAIL_ADMIN_KAMU';
