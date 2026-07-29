-- Web Push preferences: global enable + per-group notify level + announcement flag.
-- Device endpoints stay on push_subscriptions (group_id unused for targeting).

create type public.notify_level as enum ('all', 'announcements', 'none');

create table public.user_notification_prefs (
  user_id uuid primary key references auth.users (id) on delete cascade,
  push_enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

alter table public.group_members
  add column notify_level public.notify_level not null default 'all';

alter table public.messages
  add column is_announcement boolean not null default false;

alter table public.user_notification_prefs enable row level security;

create policy "user_notification_prefs_select_own"
  on public.user_notification_prefs for select
  to authenticated
  using (auth.uid() = user_id);

create policy "user_notification_prefs_insert_own"
  on public.user_notification_prefs for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "user_notification_prefs_update_own"
  on public.user_notification_prefs for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Client upserts push_subscriptions on (user_id, endpoint)
create policy "push_subscriptions_update_own"
  on public.push_subscriptions for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant usage on type public.notify_level to anon, authenticated, service_role;
grant all on table public.user_notification_prefs to postgres, anon, authenticated, service_role;
