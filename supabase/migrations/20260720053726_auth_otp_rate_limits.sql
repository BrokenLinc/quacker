create schema if not exists private;

revoke all on schema private from public, anon, authenticated;
grant usage on schema private to postgres, service_role;

create table private.auth_otp_rate_limits (
  identifier text primary key,
  window_started_at timestamptz not null default now(),
  attempt_count integer not null default 1
);

alter table private.auth_otp_rate_limits enable row level security;

grant select, insert, update on private.auth_otp_rate_limits
  to postgres, service_role;

create or replace function public.check_auth_otp_rate_limit(
  p_identifier text,
  p_max_attempts integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
volatile
security invoker
set search_path = ''
as $$
declare
  allowed boolean;
begin
  if p_identifier is null or p_max_attempts < 1 or p_window_seconds < 1 then
    raise exception 'Invalid rate limit parameters';
  end if;

  insert into private.auth_otp_rate_limits as rate_limit (identifier)
  values (p_identifier)
  on conflict (identifier) do update
  set
    window_started_at = case
      when rate_limit.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then now()
      else rate_limit.window_started_at
    end,
    attempt_count = case
      when rate_limit.window_started_at <= now() - make_interval(secs => p_window_seconds)
        then 1
      else rate_limit.attempt_count + 1
    end
  returning rate_limit.attempt_count <= p_max_attempts into allowed;

  return allowed;
end;
$$;

revoke all on function public.check_auth_otp_rate_limit(text, integer, integer)
  from public, anon, authenticated;
grant execute on function public.check_auth_otp_rate_limit(text, integer, integer)
  to postgres, service_role;
