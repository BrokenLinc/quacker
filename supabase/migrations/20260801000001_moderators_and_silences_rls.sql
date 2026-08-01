-- Room moderators + persistent silence (uses enum value 'mod' from prior migration)
--
-- 1. group_silences persists mute across leave/rejoin (not on membership).
-- 2. Staff (creator or mod) may rename rooms and manage silence/mod.
-- 3. Drop creator kick (ban); membership only via self-leave or room delete.
--
-- Idempotent: safe if an earlier combined migration already applied these objects
-- (e.g. remotes that ran the pre-split 20260801000000).

-- ---------------------------------------------------------------------------
-- Persistent silence (survives leave/rejoin)
-- ---------------------------------------------------------------------------

create table if not exists public.group_silences (
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text,
  photo_url text,
  silenced_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_silences_user_id_idx on public.group_silences (user_id);

alter table public.group_silences enable row level security;

do $$ begin
  alter publication supabase_realtime add table public.group_silences;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- Helpers (security definer — safe to call from RLS / triggers)
-- ---------------------------------------------------------------------------

create or replace function public.is_group_staff(gid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    exists (
      select 1 from public.groups g
      where g.id = gid and g.creator_id = auth.uid()
    )
    or exists (
      select 1 from public.group_members gm
      where gm.group_id = gid
        and gm.user_id = auth.uid()
        and gm.role in ('creator', 'mod')
    );
$$;

create or replace function public.is_silenced_in_group(gid uuid, uid uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_silences s
    where s.group_id = gid and s.user_id = uid
  );
$$;

revoke all on function public.is_group_staff(uuid) from public;
revoke all on function public.is_silenced_in_group(uuid, uuid) from public;
grant execute on function public.is_group_staff(uuid) to authenticated, service_role;
grant execute on function public.is_silenced_in_group(uuid, uuid) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Role-change enforcement (member <-> mod only)
-- ---------------------------------------------------------------------------

create or replace function public.enforce_member_role_change()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  room_creator uuid;
begin
  if new.role is not distinct from old.role then
    return new;
  end if;

  -- Never assign or strip creator via UPDATE
  if old.role = 'creator' or new.role = 'creator' then
    raise exception 'cannot change creator role';
  end if;

  if old.role not in ('member', 'mod') or new.role not in ('member', 'mod') then
    raise exception 'invalid role transition';
  end if;

  select g.creator_id into room_creator
  from public.groups g
  where g.id = new.group_id;

  if new.user_id = room_creator then
    raise exception 'cannot change room creator membership role';
  end if;

  -- Self-unmod only
  if actor = new.user_id then
    if old.role = 'mod' and new.role = 'member' then
      return new;
    end if;
    raise exception 'cannot change own role except self-unmod';
  end if;

  if public.is_group_staff(new.group_id) then
    return new;
  end if;

  raise exception 'not allowed to change member role';
end;
$$;

drop trigger if exists group_members_enforce_role on public.group_members;
create trigger group_members_enforce_role
  before update of role on public.group_members
  for each row
  execute function public.enforce_member_role_change();

-- ---------------------------------------------------------------------------
-- RLS: groups rename for staff
-- ---------------------------------------------------------------------------

drop policy if exists "groups_update_creator" on public.groups;
drop policy if exists "groups_update_staff" on public.groups;

create policy "groups_update_staff"
  on public.groups for update
  to authenticated
  using (public.is_group_staff(id))
  with check (public.is_group_staff(id));

-- ---------------------------------------------------------------------------
-- RLS: no kick — only self-leave
-- ---------------------------------------------------------------------------

drop policy if exists "group_members_delete_creator" on public.group_members;

drop policy if exists "group_members_update_staff" on public.group_members;
create policy "group_members_update_staff"
  on public.group_members for update
  to authenticated
  using (public.is_group_staff(group_id))
  with check (public.is_group_staff(group_id));

-- ---------------------------------------------------------------------------
-- RLS: messages — members who are not silenced
-- ---------------------------------------------------------------------------

drop policy if exists "messages_insert_member" on public.messages;

create policy "messages_insert_member"
  on public.messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = messages.group_id
        and gm.user_id = auth.uid()
    )
    and not public.is_silenced_in_group(messages.group_id, auth.uid())
  );

-- ---------------------------------------------------------------------------
-- RLS: group_silences
-- ---------------------------------------------------------------------------

drop policy if exists "group_silences_select_authenticated" on public.group_silences;
create policy "group_silences_select_authenticated"
  on public.group_silences for select
  to authenticated
  using (true);

drop policy if exists "group_silences_insert_staff" on public.group_silences;
create policy "group_silences_insert_staff"
  on public.group_silences for insert
  to authenticated
  with check (
    public.is_group_staff(group_id)
    and user_id <> auth.uid()
    and not exists (
      select 1 from public.groups g
      where g.id = group_id and g.creator_id = user_id
    )
  );

drop policy if exists "group_silences_delete_staff" on public.group_silences;
create policy "group_silences_delete_staff"
  on public.group_silences for delete
  to authenticated
  using (public.is_group_staff(group_id));

drop policy if exists "group_silences_update_staff" on public.group_silences;
create policy "group_silences_update_staff"
  on public.group_silences for update
  to authenticated
  using (public.is_group_staff(group_id))
  with check (
    public.is_group_staff(group_id)
    and user_id <> auth.uid()
    and not exists (
      select 1 from public.groups g
      where g.id = group_id and g.creator_id = user_id
    )
  );
