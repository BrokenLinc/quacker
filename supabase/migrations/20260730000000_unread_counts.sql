-- Track when a member last viewed a group chat; power unread badge counts.

alter table public.group_members
  add column last_viewed_at timestamptz not null default now();

-- Existing memberships: treat as viewed now so history does not light every badge.
update public.group_members
set last_viewed_at = now()
where true;

create or replace function public.unread_message_counts()
returns table (group_id uuid, count bigint)
language sql
stable
security invoker
set search_path = public
as $$
  select
    gm.group_id,
    case
      when gm.notify_level = 'none' then 0::bigint
      else (
        select count(*)::bigint
        from public.messages m
        where m.group_id = gm.group_id
          and m.created_at > gm.last_viewed_at
          and m.author_id <> gm.user_id
          and (
            gm.notify_level = 'all'
            or (
              gm.notify_level = 'announcements'
              and m.is_announcement
            )
          )
      )
    end as count
  from public.group_members gm
  where gm.user_id = auth.uid();
$$;

grant execute on function public.unread_message_counts() to authenticated;
