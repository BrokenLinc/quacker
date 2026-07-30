-- Store phone last-4 on memberships so chat can show (1234) next to
-- customized display names without reading other users' auth.users rows.

alter table public.group_members
  add column phone_last4 text;

update public.group_members gm
set phone_last4 = right(regexp_replace(u.phone, '\D', '', 'g'), 4)
from auth.users u
where u.id = gm.user_id
  and u.phone is not null
  and length(regexp_replace(u.phone, '\D', '', 'g')) >= 4;
