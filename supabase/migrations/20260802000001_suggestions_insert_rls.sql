-- Prevent clients from seeding vote_count / status on suggestion insert.

drop policy if exists suggestions_insert_own on public.suggestions;

create policy suggestions_insert_own
  on public.suggestions for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and status = 'new'
    and vote_count = 0
  );
