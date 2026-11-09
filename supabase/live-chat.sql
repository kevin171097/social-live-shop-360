-- KD.LIVE: chat, likes y presencia para transmisiones.
-- Ejecutar una sola vez en Supabase SQL Editor sobre el proyecto de KD.LIVE.

create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 300),
  created_at timestamptz not null default now()
);

create table if not exists public.live_likes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  user_id uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists live_messages_session_created_idx
  on public.live_messages(session_id, created_at desc);
create index if not exists live_likes_session_created_idx
  on public.live_likes(session_id, created_at desc);

alter table public.live_messages enable row level security;
alter table public.live_likes enable row level security;

drop policy if exists "messages visible in live sessions" on public.live_messages;
create policy "messages visible in live sessions"
on public.live_messages for select
using (
  exists (
    select 1 from public.live_sessions s
    where s.id = session_id and s.status = 'live'
  )
);

drop policy if exists "authenticated users send live messages" on public.live_messages;
create policy "authenticated users send live messages"
on public.live_messages for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.live_sessions s
    where s.id = session_id and s.status = 'live'
  )
);

drop policy if exists "likes visible in live sessions" on public.live_likes;
create policy "likes visible in live sessions"
on public.live_likes for select
using (
  exists (
    select 1 from public.live_sessions s
    where s.id = session_id and s.status = 'live'
  )
);

drop policy if exists "authenticated users like live sessions" on public.live_likes;
create policy "authenticated users like live sessions"
on public.live_likes for insert
with check (
  user_id = auth.uid()
  and exists (
    select 1 from public.live_sessions s
    where s.id = session_id and s.status = 'live'
  )
);

-- Habilita eventos en tiempo real para las tablas del chat y los likes.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_messages'
  ) then
    alter publication supabase_realtime add table public.live_messages;
  end if;
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'live_likes'
  ) then
    alter publication supabase_realtime add table public.live_likes;
  end if;
end $$;
