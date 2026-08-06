-- Per-message emoji reactions (fixed allow-list; toggle via insert/delete)

create table public.message_reactions (
  message_id uuid not null references public.messages (id) on delete cascade,
  group_id uuid not null references public.groups (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  emoji text not null,
  created_at timestamptz not null default now(),
  primary key (message_id, user_id, emoji),
  constraint message_reactions_emoji_allowed check (
    emoji in (
      '❤️',
      '👍',
      '👎',
      '✅',
      '👀',
      '👏',
      '🙏',
      '👋',
      '🎉',
      '💯',
      '🔥',
      '😂'
    )
  )
);

create index message_reactions_group_message_idx
  on public.message_reactions (group_id, message_id);

alter table public.message_reactions enable row level security;

-- Readable by any signed-in user (matches messages select policy).
create policy message_reactions_select_authenticated
  on public.message_reactions for select
  to authenticated
  using (true);

-- Members may add their own reaction; emoji must be on the allow-list (CHECK)
-- and group_id must match the message's room.
create policy message_reactions_insert_member
  on public.message_reactions for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.messages m
      join public.group_members gm
        on gm.group_id = m.group_id
       and gm.user_id = auth.uid()
      where m.id = message_reactions.message_id
        and m.group_id = message_reactions.group_id
    )
  );

-- Users may remove only their own reactions.
create policy message_reactions_delete_own
  on public.message_reactions for delete
  to authenticated
  using (auth.uid() = user_id);

grant all on table public.message_reactions to authenticated;
grant all on table public.message_reactions to service_role;

do $$ begin
  alter publication supabase_realtime add table public.message_reactions;
exception
  when duplicate_object then null;
end $$;
