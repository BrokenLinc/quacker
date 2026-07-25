-- Member roster support + leave/delete flows
--
-- 1. group_members gains denormalized display columns so the app can render a
--    roster without access to auth.users.
-- 2. Creator trigger copies the group author's name/photo.
-- 3. RLS: members may leave (delete self), creators may remove members and
--    delete their groups.

alter table public.group_members
  add column display_name text,
  add column photo_url text;

create or replace function public.handle_new_group()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.group_members (group_id, user_id, role, display_name, photo_url)
  values (new.id, new.creator_id, 'creator', new.author_name, new.author_photo_url);
  return new;
end;
$$;

-- Members may update their own denormalized profile fields
create policy "group_members_update_self"
  on public.group_members for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Leave group (delete own membership)
create policy "group_members_delete_self"
  on public.group_members for delete
  to authenticated
  using (auth.uid() = user_id);

-- Creators may remove members from their groups
create policy "group_members_delete_creator"
  on public.group_members for delete
  to authenticated
  using (
    exists (
      select 1 from public.groups g
      where g.id = group_members.group_id
        and g.creator_id = auth.uid()
    )
  );

-- Creators may delete their groups (cascades to members + messages)
create policy "groups_delete_creator"
  on public.groups for delete
  to authenticated
  using (auth.uid() = creator_id);
