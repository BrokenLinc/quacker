-- Product feedback: suggestions + upvotes, SuperAdmin status

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.suggestion_category as enum (
  'feature_request',
  'bug_report',
  'other'
);

create type public.suggestion_status as enum (
  'new',
  'under_review',
  'in_development',
  'done'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.suggestions (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references auth.users (id) on delete cascade,
  author_display_name text,
  title text not null,
  body text not null,
  category public.suggestion_category not null,
  status public.suggestion_status not null default 'new',
  vote_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint suggestions_title_len check (char_length(title) between 1 and 80),
  constraint suggestions_body_len check (char_length(body) between 1 and 2000)
);

create index suggestions_vote_created_idx
  on public.suggestions (vote_count desc, created_at desc);

create table public.suggestion_votes (
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suggestion_id, user_id)
);

create index suggestion_votes_user_id_idx on public.suggestion_votes (user_id);

alter table public.suggestions enable row level security;
alter table public.suggestion_votes enable row level security;

do $$ begin
  alter publication supabase_realtime add table public.suggestions;
exception
  when duplicate_object then null;
end $$;

do $$ begin
  alter publication supabase_realtime add table public.suggestion_votes;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- SuperAdmin (hard-coded phone digits for now)
-- ---------------------------------------------------------------------------

create or replace function public.is_superadmin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from auth.users u
    where u.id = auth.uid()
      and regexp_replace(coalesce(u.phone, ''), '\D', '', 'g') = '13522622098'
  );
$$;

revoke all on function public.is_superadmin() from public;
grant execute on function public.is_superadmin() to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- Vote count maintenance + author auto-upvote
-- ---------------------------------------------------------------------------

create or replace function public.suggestion_votes_adjust_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.suggestions
    set vote_count = vote_count + 1,
        updated_at = now()
    where id = new.suggestion_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.suggestions
    set vote_count = greatest(vote_count - 1, 0),
        updated_at = now()
    where id = old.suggestion_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger suggestion_votes_adjust_count
  after insert or delete on public.suggestion_votes
  for each row
  execute function public.suggestion_votes_adjust_count();

-- Author gets an automatic upvote (vote_count trigger runs on the insert)
create or replace function public.suggestions_author_auto_vote()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.suggestion_votes (suggestion_id, user_id)
  values (new.id, new.author_id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger suggestions_author_auto_vote
  after insert on public.suggestions
  for each row
  execute function public.suggestions_author_auto_vote();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

create policy suggestions_select_authenticated
  on public.suggestions for select
  to authenticated
  using (true);

create policy suggestions_insert_own
  on public.suggestions for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and status = 'new'
    and vote_count = 0
  );

create policy suggestions_update_superadmin
  on public.suggestions for update
  to authenticated
  using (public.is_superadmin())
  with check (public.is_superadmin());

create policy suggestion_votes_select_authenticated
  on public.suggestion_votes for select
  to authenticated
  using (true);

create policy suggestion_votes_insert_own
  on public.suggestion_votes for insert
  to authenticated
  with check (user_id = auth.uid());

create policy suggestion_votes_delete_own
  on public.suggestion_votes for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Grants (CLI no longer auto-exposes new tables)
-- ---------------------------------------------------------------------------

grant all on table public.suggestions to authenticated;
grant all on table public.suggestion_votes to authenticated;
grant select on table public.suggestions to anon;
grant select on table public.suggestion_votes to anon;
