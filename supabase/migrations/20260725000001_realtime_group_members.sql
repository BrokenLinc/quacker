-- Enable Realtime on group_members so sidebar/home lists refresh on join/leave
alter publication supabase_realtime add table public.group_members;
