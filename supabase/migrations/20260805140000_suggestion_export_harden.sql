-- Harden suggestion_export: use is_user_superadmin (no anon EXECUTE) and drop
-- the duplicate user_is_superadmin that was granted to anon.

create or replace function public.suggestion_export(p_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when s.id is null then null
    else jsonb_build_object(
      'id', s.id,
      'title', s.title,
      'description', s.body,
      'category', s.category,
      'status', s.status,
      'voteCount', s.vote_count,
      'commentCount', s.comment_count,
      'author', jsonb_build_object(
        'displayName', s.author_display_name,
        'isSuperAdmin', public.is_user_superadmin(s.author_id)
      ),
      'comments', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'id', c.id,
              'body', c.body,
              'createdAt', c.created_at,
              'author', jsonb_build_object(
                'displayName', c.author_display_name,
                'isSuperAdmin', public.is_user_superadmin(c.author_id)
              )
            )
            order by c.created_at asc
          )
          from public.suggestion_comments c
          where c.suggestion_id = s.id
        ),
        '[]'::jsonb
      ),
      'createdAt', s.created_at,
      'updatedAt', s.updated_at
    )
  end
  from (select p_id as id) q
  left join public.suggestions s on s.id = q.id;
$$;

drop function if exists public.user_is_superadmin(uuid);
