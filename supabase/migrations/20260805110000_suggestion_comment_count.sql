-- Denormalized comment count for suggestion list rows (mirrors vote_count).

alter table public.suggestions
  add column comment_count integer not null default 0;

-- Backfill from existing comments
update public.suggestions s
set comment_count = coalesce(c.cnt, 0)
from (
  select suggestion_id, count(*)::integer as cnt
  from public.suggestion_comments
  group by suggestion_id
) c
where s.id = c.suggestion_id;

create or replace function public.suggestion_comments_adjust_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    update public.suggestions
    set comment_count = comment_count + 1,
        updated_at = now()
    where id = new.suggestion_id;
    return new;
  elsif tg_op = 'DELETE' then
    update public.suggestions
    set comment_count = greatest(comment_count - 1, 0),
        updated_at = now()
    where id = old.suggestion_id;
    return old;
  end if;
  return null;
end;
$$;

create trigger suggestion_comments_adjust_count
  after insert or delete on public.suggestion_comments
  for each row
  execute function public.suggestion_comments_adjust_count();

-- Clients must not seed comment_count on insert (same as vote_count).
drop policy if exists suggestions_insert_own on public.suggestions;

create policy suggestions_insert_own
  on public.suggestions for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and status = 'new'
    and vote_count = 0
    and comment_count = 0
  );
