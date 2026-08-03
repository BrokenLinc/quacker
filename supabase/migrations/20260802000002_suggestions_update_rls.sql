-- SuperAdmin may change workflow status, not trigger-owned vote_count.

drop policy if exists suggestions_update_superadmin on public.suggestions;

create policy suggestions_update_superadmin
  on public.suggestions for update
  to authenticated
  using (public.is_superadmin())
  with check (
    public.is_superadmin()
    and vote_count = (
      select s.vote_count from public.suggestions s where s.id = suggestions.id
    )
  );

-- Clients may only UPDATE status columns; vote_count stays trigger-maintained.
-- SECURITY DEFINER vote triggers run as the table owner and still update counts.
revoke update on table public.suggestions from authenticated;
grant update (status, updated_at) on table public.suggestions to authenticated;
