-- Social Live Shop 360: esquema inicial de datos para Supabase.
-- Revisar y probar las políticas en un proyecto de desarrollo antes de producción.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text unique not null,
  display_name text not null,
  bio text default '',
  avatar_url text,
  role text not null default 'buyer' check (role in ('buyer','seller','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  description text default '',
  price numeric(12,2) not null check (price >= 0),
  currency text not null default 'UYU',
  image_url text,
  stock integer not null default 0 check (stock >= 0),
  status text not null default 'draft' check (status in ('draft','active','paused','sold_out')),
  created_at timestamptz not null default now()
);

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  seller_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  category text default 'general',
  status text not null default 'scheduled' check (status in ('scheduled','live','ended','blocked_review')),
  stream_provider text,
  provider_stream_id text,
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  buyer_id uuid not null references public.profiles(id),
  seller_id uuid not null references public.profiles(id),
  product_id uuid not null references public.products(id),
  quantity integer not null check (quantity > 0),
  unit_price numeric(12,2) not null check (unit_price >= 0),
  currency text not null default 'UYU',
  status text not null default 'pending' check (status in ('pending','paid','processing','shipped','completed','cancelled','refunded')),
  payment_provider text,
  provider_payment_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id),
  target_user_id uuid references public.profiles(id),
  live_session_id uuid references public.live_sessions(id),
  reason text not null,
  details text default '',
  status text not null default 'pending_review' check (status in ('pending_review','under_review','dismissed','action_taken')),
  reviewed_at timestamptz,
  reviewer_id uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  check (target_user_id is not null or live_session_id is not null)
);

create table if not exists public.report_appeals (
  id uuid primary key default gen_random_uuid(),
  report_id uuid references public.reports(id) on delete cascade,
  appellant_id uuid not null references public.profiles(id),
  explanation text not null,
  status text not null default 'pending_review' check (status in ('pending_review','accepted','rejected')),
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists products_seller_status_idx on public.products(seller_id,status);
create index if not exists lives_status_created_idx on public.live_sessions(status,created_at desc);
create index if not exists orders_buyer_created_idx on public.orders(buyer_id,created_at desc);
create index if not exists reports_status_created_idx on public.reports(status,created_at desc);

alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.live_sessions enable row level security;
alter table public.orders enable row level security;
alter table public.reports enable row level security;
alter table public.report_appeals enable row level security;

create policy "profiles readable" on public.profiles for select using (true);
drop policy if exists "profile owner inserts" on public.profiles;
create policy "profile owner inserts" on public.profiles for insert with check (auth.uid() = id and role = 'buyer');
create policy "profile owner updates" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);
create policy "active products readable" on public.products for select using (status = 'active' or seller_id = auth.uid());
create policy "seller creates products" on public.products for insert with check (seller_id = auth.uid());
create policy "seller updates products" on public.products for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
drop policy if exists "seller deletes products" on public.products;
create policy "seller deletes products" on public.products for delete using (
  seller_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('seller','admin'))
);
create policy "live sessions readable" on public.live_sessions for select using (true);
create policy "seller creates live" on public.live_sessions for insert with check (seller_id = auth.uid());
create policy "seller updates live" on public.live_sessions for update using (seller_id = auth.uid()) with check (seller_id = auth.uid());
create policy "buyer reads own orders" on public.orders for select using (buyer_id = auth.uid() or seller_id = auth.uid());
create policy "buyer creates own order" on public.orders for insert with check (buyer_id = auth.uid());
create policy "reporter creates report" on public.reports for insert with check (reporter_id = auth.uid());
create policy "reporter reads own reports" on public.reports for select using (reporter_id = auth.uid());
create policy "user creates appeal" on public.report_appeals for insert with check (appellant_id = auth.uid());
create policy "appellant reads own appeals" on public.report_appeals for select using (appellant_id = auth.uid());

-- Acciones administrativas y cambios de estado requieren backend seguro.


-- Endurecimiento de permisos: un usuario no puede asignarse el rol seller/admin.
create or replace function public.prevent_self_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role
     and auth.uid() is not null
     and not exists (
       select 1 from public.profiles actor
       where actor.id = auth.uid() and actor.role = 'admin'
     ) then
    raise exception 'Solo un administrador puede cambiar roles';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_role_guard on public.profiles;
create trigger profiles_role_guard
before update of role on public.profiles
for each row execute function public.prevent_self_role_escalation();

-- Los compradores no pueden crear publicaciones ni transmisiones.
drop policy if exists "seller creates products" on public.products;
create policy "seller creates products" on public.products
for insert with check (
  seller_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('seller','admin'))
);

drop policy if exists "seller updates products" on public.products;
create policy "seller updates products" on public.products
for update using (
  seller_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('seller','admin'))
) with check (
  seller_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('seller','admin'))
);

drop policy if exists "seller creates live" on public.live_sessions;
create policy "seller creates live" on public.live_sessions
for insert with check (
  seller_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('seller','admin'))
);

drop policy if exists "seller updates live" on public.live_sessions;
create policy "seller updates live" on public.live_sessions
for update using (
  seller_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('seller','admin'))
) with check (
  seller_id = auth.uid()
  and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('seller','admin'))
);
