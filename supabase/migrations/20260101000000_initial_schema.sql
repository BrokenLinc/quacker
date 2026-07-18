-- Quacker core schema: groups, messages, members

create type public.group_role as enum ('creator', 'member');

create table public.groups (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  creator_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  author_name text,
  author_photo_url text,
  created_at timestamptz not null default now()
);

create index groups_created_at_idx on public.groups (created_at desc);
create index groups_slug_idx on public.groups (slug);

create table public.group_members (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.group_role not null default 'member',
  joined_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index group_members_user_id_idx on public.group_members (user_id);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_name text,
  author_photo_url text,
  text text not null,
  created_at timestamptz not null default now()
);

create index messages_group_created_idx on public.messages (group_id, created_at desc);

-- Web Push subscriptions (Phase 5)
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  group_id uuid references public.groups (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

-- Realtime for live message feeds
alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.groups;

-- Auto-add creator as group member on insert
create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role)
  values (new.id, new.creator_id, 'creator');
  return new;
end;
$$;

create trigger on_group_created
  after insert on public.groups
  for each row execute function public.handle_new_group();
