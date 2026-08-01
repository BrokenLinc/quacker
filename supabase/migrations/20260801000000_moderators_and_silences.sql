-- Add group_role enum value 'mod' alone.
-- Postgres forbids using a new enum label in the same transaction as ADD VALUE
-- (SQLSTATE 55P04). CI `supabase start` / `db reset` runs each migration in a
-- transaction — keep this file free of any reference to 'mod'.

alter type public.group_role add value if not exists 'mod';
