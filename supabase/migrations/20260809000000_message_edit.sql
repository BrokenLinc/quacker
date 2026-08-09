-- Authors may edit their own non-admin messages. edited_at is set when text changes.
-- Immutable columns are guarded by trigger so UPDATE RLS cannot be used to move
-- authorship, room, or admin/announcement flags.

alter table public.messages
  add column if not exists edited_at timestamptz;

create or replace function public.messages_update_guard()
returns trigger
language plpgsql
as $$
begin
  if
    new.id is distinct from old.id
    or new.group_id is distinct from old.group_id
    or new.author_id is distinct from old.author_id
    or new.created_at is distinct from old.created_at
    or new.is_admin_message is distinct from old.is_admin_message
    or new.is_announcement is distinct from old.is_announcement
    or new.author_name is distinct from old.author_name
    or new.author_photo_url is distinct from old.author_photo_url
  then
    raise exception 'messages update may only change text and edited_at';
  end if;

  if new.text is distinct from old.text then
    new.edited_at := now();
  end if;

  return new;
end;
$$;

drop trigger if exists messages_update_guard on public.messages;

create trigger messages_update_guard
  before update on public.messages
  for each row
  execute function public.messages_update_guard();

drop policy if exists "messages_update_own" on public.messages;

create policy "messages_update_own"
  on public.messages for update
  to authenticated
  using (
    author_id = auth.uid()
    and coalesce(is_admin_message, false) = false
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
  )
  with check (
    author_id = auth.uid()
    and coalesce(is_admin_message, false) = false
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
