-- RLS: authenticated users; members post; creators manage groups

alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.messages enable row level security;
alter table public.push_subscriptions enable row level security;

-- Groups: open discovery (match legacy Firestore list-all behavior)
create policy "groups_select_authenticated"
  on public.groups for select
  to authenticated
  using (true);

create policy "groups_insert_authenticated"
  on public.groups for insert
  to authenticated
  with check (auth.uid() = creator_id);

create policy "groups_update_creator"
  on public.groups for update
  to authenticated
  using (auth.uid() = creator_id);

-- Members: visible to authenticated; users can join themselves
create policy "group_members_select_authenticated"
  on public.group_members for select
  to authenticated
  using (true);

create policy "group_members_insert_self"
  on public.group_members for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Messages: readable by authenticated; writable by group members
create policy "messages_select_authenticated"
  on public.messages for select
  to authenticated
  using (true);

create policy "messages_insert_member"
  on public.messages for insert
  to authenticated
  with check (
    exists (
      select 1 from public.group_members gm
      where gm.group_id = messages.group_id
        and gm.user_id = auth.uid()
    )
  );

-- Push subscriptions: users manage their own
create policy "push_subscriptions_select_own"
  on public.push_subscriptions for select
  to authenticated
  using (auth.uid() = user_id);

create policy "push_subscriptions_insert_own"
  on public.push_subscriptions for insert
  to authenticated
  with check (auth.uid() = user_id);

create policy "push_subscriptions_delete_own"
  on public.push_subscriptions for delete
  to authenticated
  using (auth.uid() = user_id);
