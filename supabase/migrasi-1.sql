-- Jalankan SEKALI di Supabase > SQL Editor jika tabel products sudah dibuat dengan skema lama
-- (yang punya kolom product_code, category, price, marketplace, description).
-- Aman dijalankan ulang: tidak melakukan apa-apa bila sudah dimigrasi.
do $$
begin
  if exists (select 1 from information_schema.columns
             where table_schema='public' and table_name='products' and column_name='product_code') then
    alter table public.products add column if not exists number integer;
    -- BS-001 / GS-012 -> 1 / 12
    update public.products set number = nullif(regexp_replace(product_code,'^\D+-',''),'')::integer where number is null;
    alter table public.products alter column number set not null;
    alter table public.products drop column product_code;   -- ikut menghapus aturan BS-/GS-
    alter table public.products drop column category;
    alter table public.products drop column price;
    alter table public.products drop column currency;
    alter table public.products drop column description;
    alter table public.products drop column marketplace;
    alter table public.products add constraint products_number_positive check (number > 0);
    alter table public.products add constraint products_brand_number_key unique (brand, number);
  end if;
end $$;
