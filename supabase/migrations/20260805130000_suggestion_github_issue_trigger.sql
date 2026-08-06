-- Fire suggestion-github-issue after suggestion insert via pg_net.
-- URL + secret live in Vault (set by scripts/setup-suggestion-github-webhook.sh).
-- If vault secrets are missing, the trigger no-ops safely.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_suggestion_insert()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  hook_url text;
  hook_secret text;
begin
  begin
    select decrypted_secret into hook_url
    from vault.decrypted_secrets
    where name = 'suggestion_github_webhook_url'
    limit 1;
  exception
    when undefined_table then
      return NEW;
    when others then
      return NEW;
  end;

  begin
    select decrypted_secret into hook_secret
    from vault.decrypted_secrets
    where name = 'suggestion_github_webhook_secret'
    limit 1;
  exception
    when others then
      hook_secret := null;
  end;

  if hook_url is null or length(hook_url) = 0 then
    return NEW;
  end if;

  perform net.http_post(
    url := hook_url,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', coalesce(hook_secret, '')
    ),
    body := jsonb_build_object('record', row_to_json(NEW)::jsonb)
  );
  return NEW;
end;
$$;

drop trigger if exists on_suggestion_github_issue on public.suggestions;
create trigger on_suggestion_github_issue
  after insert on public.suggestions
  for each row
  execute function public.notify_suggestion_insert();
