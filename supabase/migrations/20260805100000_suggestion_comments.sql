-- Suggestion detail: comment thread on a suggestion

create table public.suggestion_comments (
  id uuid primary key default gen_random_uuid(),
  suggestion_id uuid not null references public.suggestions (id) on delete cascade,
  author_id uuid not null references auth.users (id) on delete cascade,
  author_display_name text,
  body text not null,
  created_at timestamptz not null default now(),
  constraint suggestion_comments_body_len check (char_length(body) between 1 and 1000)
);

create index suggestion_comments_suggestion_created_idx
  on public.suggestion_comments (suggestion_id, created_at asc);

alter table public.suggestion_comments enable row level security;

do $$ begin
  alter publication supabase_realtime add table public.suggestion_comments;
exception
  when duplicate_object then null;
end $$;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

create policy suggestion_comments_select_authenticated
  on public.suggestion_comments for select
  to authenticated
  using (true);

create policy suggestion_comments_insert_own
  on public.suggestion_comments for insert
  to authenticated
  with check (author_id = auth.uid());

create policy suggestion_comments_delete_own
  on public.suggestion_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_superadmin());

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant all on table public.suggestion_comments to authenticated;
grant select on table public.suggestion_comments to anon;
