-- SuperAdmin tools: site lockdown, user super-ban, group soft-delete /
-- deactivate, admin message flag, denormalized counts, admin list RPCs.

-- ---------------------------------------------------------------------------
-- site_settings (singleton)
-- ---------------------------------------------------------------------------

create table public.site_settings (
  id boolean primary key default true check (id),
  lockdown boolean not null default false,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id, lockdown) values (true, false);

alter table public.site_settings enable row level security;

create policy "site_settings_select_authenticated"
  on public.site_settings for select
  to authenticated
  using (true);

-- Anon needs lockdown flag for signed-out /superadmin gating.
create policy "site_settings_select_anon"
  on public.site_settings for select
  to anon
  using (true);

create policy "site_settings_update_superadmin"
  on public.site_settings for update
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

grant select on public.site_settings to anon, authenticated, service_role;
grant update (lockdown, updated_at) on public.site_settings to authenticated;

do $$ begin
  alter publication supabase_realtime add table public.site_settings;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- user_moderation (super-ban)
-- ---------------------------------------------------------------------------

create table public.user_moderation (
  user_id uuid primary key references auth.users (id) on delete cascade,
  super_banned_at timestamptz,
  super_banned_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.user_moderation enable row level security;

create policy "user_moderation_select_self_or_superadmin"
  on public.user_moderation for select
  to authenticated
  using (auth.uid() = user_id or public.is_superadmin());

create policy "user_moderation_insert_superadmin"
  on public.user_moderation for insert
  to authenticated
  with check (public.is_superadmin());

create policy "user_moderation_update_superadmin"
  on public.user_moderation for update
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

grant select, insert, update on public.user_moderation to authenticated;
grant all on public.user_moderation to service_role;

-- Helper: is a given user id a SuperAdmin (by phone), not only auth.uid().
create or replace function public.is_user_superadmin(uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = uid
      and regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') = '13522622098'
  );
$$;

revoke all on function public.is_user_superadmin(uuid) from public;
grant execute on function public.is_user_superadmin(uuid) to authenticated, service_role;

create or replace function public.enforce_user_moderation_no_self_ban()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.super_banned_at is not null then
    if new.user_id = auth.uid() then
      raise exception 'superadmins cannot self-ban';
    end if;
    if public.is_user_superadmin(new.user_id) then
      raise exception 'cannot super-ban a superadmin';
    end if;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger enforce_user_moderation_no_self_ban
  before insert or update on public.user_moderation
  for each row
  execute function public.enforce_user_moderation_no_self_ban();

create or replace function public.is_super_banned(uid uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_moderation m
    where m.user_id = uid
      and m.super_banned_at is not null
  );
$$;

revoke all on function public.is_super_banned(uuid) from public;
grant execute on function public.is_super_banned(uuid) to authenticated, service_role, anon;

-- ---------------------------------------------------------------------------
-- groups: soft-delete, deactivate, denormalized counts
-- ---------------------------------------------------------------------------

alter table public.groups
  add column if not exists deleted_at timestamptz,
  add column if not exists deleted_by uuid references auth.users (id) on delete set null,
  add column if not exists deactivated_at timestamptz,
  add column if not exists deactivated_by uuid references auth.users (id) on delete set null,
  add column if not exists member_count integer not null default 0,
  add column if not exists message_count integer not null default 0;

update public.groups g
set member_count = (
  select count(*)::integer from public.group_members gm where gm.group_id = g.id
),
message_count = (
  select count(*)::integer from public.messages m where m.group_id = g.id
);

-- Count triggers
create or replace function public.groups_adjust_member_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.groups set member_count = member_count + 1 where id = new.group_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.groups
    set member_count = greatest(member_count - 1, 0)
    where id = old.group_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists groups_adjust_member_count on public.group_members;
create trigger groups_adjust_member_count
  after insert or delete on public.group_members
  for each row
  execute function public.groups_adjust_member_count();

create or replace function public.groups_adjust_message_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.groups set message_count = message_count + 1 where id = new.group_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.groups
    set message_count = greatest(message_count - 1, 0)
    where id = old.group_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists groups_adjust_message_count on public.messages;
create trigger groups_adjust_message_count
  after insert or delete on public.messages
  for each row
  execute function public.groups_adjust_message_count();

-- Soft-state column enforcement on groups UPDATE
create or replace function public.enforce_group_soft_state_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_changed boolean;
  deactivated_changed boolean;
  counts_changed boolean;
begin
  deleted_changed :=
    new.deleted_at is distinct from old.deleted_at
    or new.deleted_by is distinct from old.deleted_by;
  deactivated_changed :=
    new.deactivated_at is distinct from old.deactivated_at
    or new.deactivated_by is distinct from old.deactivated_by;
  counts_changed :=
    new.member_count is distinct from old.member_count
    or new.message_count is distinct from old.message_count;

  -- Counters are trigger-owned; revert client tampering unless service role
  -- (auth.uid() null under some service paths — allow when no jwt user).
  if counts_changed and auth.uid() is not null then
    new.member_count := old.member_count;
    new.message_count := old.message_count;
  end if;

  if deleted_changed then
    if not (
      public.is_superadmin()
      or (auth.uid() = old.creator_id)
    ) then
      raise exception 'not allowed to change deleted state';
    end if;
    -- Only creator may set deleted; SuperAdmin may clear (restore) or also set.
    if new.deleted_at is not null
       and old.deleted_at is null
       and auth.uid() is distinct from old.creator_id
       and not public.is_superadmin() then
      raise exception 'only the creator can soft-delete a room';
    end if;
  end if;

  if deactivated_changed then
    if not public.is_superadmin() then
      raise exception 'only superadmin can change deactivated state';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists enforce_group_soft_state_change on public.groups;
create trigger enforce_group_soft_state_change
  before update on public.groups
  for each row
  execute function public.enforce_group_soft_state_change();

-- Replace open SELECT with active + creator-deleted + superadmin
drop policy if exists "groups_select_authenticated" on public.groups;

create policy "groups_select_active"
  on public.groups for select
  to authenticated
  using (deleted_at is null and deactivated_at is null);

create policy "groups_select_own_deleted"
  on public.groups for select
  to authenticated
  using (
    deleted_at is not null
    and deactivated_at is null
    and auth.uid() = creator_id
  );

create policy "groups_select_superadmin"
  on public.groups for select
  to authenticated
  using (public.is_superadmin());

-- Drop hard-delete for clients
drop policy if exists "groups_delete_creator" on public.groups;

-- Staff update kept; soft-state guarded by trigger above.
-- SuperAdmin also needs UPDATE when not staff (admin list restore/deactivate).
drop policy if exists "groups_update_superadmin" on public.groups;
create policy "groups_update_superadmin"
  on public.groups for update
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

-- Creator soft-delete / restore when not staff path (creator is staff via role,
-- but keep explicit creator update for deleted_* if staff policy ever narrows).
drop policy if exists "groups_update_creator_soft_delete" on public.groups;
create policy "groups_update_creator_soft_delete"
  on public.groups for update
  to authenticated
  using (auth.uid() = creator_id)
  with check (auth.uid() = creator_id);

-- ---------------------------------------------------------------------------
-- messages: admin flag + insert policies
-- ---------------------------------------------------------------------------

alter table public.messages
  add column if not exists is_admin_message boolean not null default false;

drop policy if exists "messages_insert_member" on public.messages;

create policy "messages_insert_member"
  on public.messages for insert
  to authenticated
  with check (
    coalesce(is_admin_message, false) = false
    and exists (
      select 1 from public.group_members gm
      where gm.group_id = messages.group_id
        and gm.user_id = auth.uid()
    )
    and not public.is_silenced_in_group(messages.group_id, auth.uid())
    and exists (
      select 1 from public.groups g
      where g.id = messages.group_id
        and g.deleted_at is null
        and g.deactivated_at is null
    )
  );

create policy "messages_insert_superadmin"
  on public.messages for insert
  to authenticated
  with check (
    public.is_superadmin()
    and is_admin_message = true
    and author_id = auth.uid()
  );

-- ---------------------------------------------------------------------------
-- Block joins on inactive groups
-- ---------------------------------------------------------------------------

drop policy if exists "group_members_insert_self" on public.group_members;

create policy "group_members_insert_self"
  on public.group_members for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from public.groups g
      where g.id = group_id
        and g.deleted_at is null
        and g.deactivated_at is null
    )
  );

-- ---------------------------------------------------------------------------
-- user_stats (denormalized for admin user list)
-- ---------------------------------------------------------------------------

create table public.user_stats (
  user_id uuid primary key references auth.users (id) on delete cascade,
  message_count integer not null default 0,
  room_count integer not null default 0,
  signed_up_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_stats enable row level security;

-- Only SuperAdmin / service_role read via RPC; no direct client SELECT needed.
create policy "user_stats_select_superadmin"
  on public.user_stats for select
  to authenticated
  using (public.is_superadmin());

grant select on public.user_stats to authenticated;
grant all on public.user_stats to service_role;

-- Backfill from auth.users + aggregates
insert into public.user_stats (user_id, message_count, room_count, signed_up_at)
select
  u.id,
  coalesce((select count(*)::integer from public.messages m where m.author_id = u.id), 0),
  coalesce((select count(*)::integer from public.group_members gm where gm.user_id = u.id), 0),
  u.created_at
from auth.users u
on conflict (user_id) do nothing;

create or replace function public.ensure_user_stats_row()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_stats (user_id, signed_up_at)
  values (new.id, coalesce(new.created_at, now()))
  on conflict (user_id) do nothing;
  return new;
end;
$$;

-- auth.users triggers require supabase_auth_admin; use a public hook via
-- existing ensure paths instead — Edge createUser + periodic backfill.
-- Also bump on membership / message changes:

create or replace function public.user_stats_on_membership()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_stats (user_id)
    values (new.user_id)
    on conflict (user_id) do update
      set room_count = public.user_stats.room_count + 1,
          updated_at = now();
    return new;
  elsif tg_op = 'DELETE' then
    update public.user_stats
    set room_count = greatest(room_count - 1, 0),
        updated_at = now()
    where user_id = old.user_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists user_stats_on_membership on public.group_members;
create trigger user_stats_on_membership
  after insert or delete on public.group_members
  for each row
  execute function public.user_stats_on_membership();

create or replace function public.user_stats_on_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.user_stats (user_id)
    values (new.author_id)
    on conflict (user_id) do update
      set message_count = public.user_stats.message_count + 1,
          updated_at = now();
    return new;
  elsif tg_op = 'DELETE' then
    update public.user_stats
    set message_count = greatest(message_count - 1, 0),
        updated_at = now()
    where user_id = old.author_id;
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists user_stats_on_message on public.messages;
create trigger user_stats_on_message
  after insert or delete on public.messages
  for each row
  execute function public.user_stats_on_message();

-- ---------------------------------------------------------------------------
-- Admin list RPCs
-- ---------------------------------------------------------------------------

create or replace function public.admin_list_groups(
  p_search text default null,
  p_created_before timestamptz default null,
  p_limit integer default 30
)
returns table (
  id uuid,
  slug text,
  name text,
  creator_id uuid,
  creator_display_name text,
  creator_phone text,
  creator_photo_url text,
  member_count integer,
  message_count integer,
  created_at timestamptz,
  deleted_at timestamptz,
  deactivated_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := nullif(trim(coalesce(p_search, '')), '');
  lim integer := least(greatest(coalesce(p_limit, 30), 1), 100);
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  return query
  select
    g.id,
    g.slug,
    g.name,
    g.creator_id,
    coalesce(
      (
        select gm.display_name
        from public.group_members gm
        where gm.group_id = g.id and gm.user_id = g.creator_id
        limit 1
      ),
      g.author_name,
      coalesce(u.raw_user_meta_data->>'display_name', '')
    ) as creator_display_name,
    coalesce(u.phone, '') as creator_phone,
    coalesce(
      (
        select gm.photo_url
        from public.group_members gm
        where gm.group_id = g.id and gm.user_id = g.creator_id
        limit 1
      ),
      g.author_photo_url,
      u.raw_user_meta_data->>'avatar_url'
    ) as creator_photo_url,
    g.member_count,
    g.message_count,
    g.created_at,
    g.deleted_at,
    g.deactivated_at
  from public.groups g
  left join auth.users u on u.id = g.creator_id
  where (p_created_before is null or g.created_at < p_created_before)
    and (
      q is null
      or g.name ilike '%' || q || '%'
      or coalesce(g.author_name, '') ilike '%' || q || '%'
      or coalesce(u.raw_user_meta_data->>'display_name', '') ilike '%' || q || '%'
      or exists (
        select 1 from public.group_members gm
        where gm.group_id = g.id
          and gm.user_id = g.creator_id
          and coalesce(gm.display_name, '') ilike '%' || q || '%'
      )
    )
  order by g.created_at desc
  limit lim;
end;
$$;

revoke all on function public.admin_list_groups(text, timestamptz, integer) from public;
grant execute on function public.admin_list_groups(text, timestamptz, integer)
  to authenticated, service_role;

create or replace function public.admin_list_users(
  p_search text default null,
  p_signed_up_before timestamptz default null,
  p_limit integer default 30
)
returns table (
  user_id uuid,
  display_name text,
  phone text,
  photo_url text,
  message_count integer,
  room_count integer,
  signed_up_at timestamptz,
  super_banned_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  q text := nullif(trim(coalesce(p_search, '')), '');
  lim integer := least(greatest(coalesce(p_limit, 30), 1), 100);
  q_digits text;
begin
  if not public.is_superadmin() then
    raise exception 'forbidden';
  end if;

  q_digits := nullif(regexp_replace(coalesce(q, ''), '\D', '', 'g'), '');

  return query
  select
    u.id as user_id,
    coalesce(u.raw_user_meta_data->>'display_name', '') as display_name,
    coalesce(u.phone, '') as phone,
    u.raw_user_meta_data->>'avatar_url' as photo_url,
    coalesce(s.message_count, 0) as message_count,
    coalesce(s.room_count, 0) as room_count,
    coalesce(s.signed_up_at, u.created_at) as signed_up_at,
    m.super_banned_at
  from auth.users u
  left join public.user_stats s on s.user_id = u.id
  left join public.user_moderation m on m.user_id = u.id
  where (p_signed_up_before is null or coalesce(s.signed_up_at, u.created_at) < p_signed_up_before)
    and (
      q is null
      or coalesce(u.raw_user_meta_data->>'display_name', '') ilike '%' || q || '%'
      or (q_digits is not null and regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') like '%' || q_digits || '%')
    )
  order by coalesce(s.signed_up_at, u.created_at) desc
  limit lim;
end;
$$;

revoke all on function public.admin_list_users(text, timestamptz, integer) from public;
grant execute on function public.admin_list_users(text, timestamptz, integer)
  to authenticated, service_role;

-- Lockdown helper for Edge (service role / anon via RPC)
create or replace function public.get_site_lockdown()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select coalesce((select lockdown from public.site_settings where id = true), false);
$$;

revoke all on function public.get_site_lockdown() from public;
grant execute on function public.get_site_lockdown() to anon, authenticated, service_role;

-- Phone digit SuperAdmin check for Edge (no JWT)
create or replace function public.is_superadmin_phone(p_phone text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') = '13522622098';
$$;

revoke all on function public.is_superadmin_phone(text) from public;
grant execute on function public.is_superadmin_phone(text) to anon, authenticated, service_role;
