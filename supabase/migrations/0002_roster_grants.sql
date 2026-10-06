-- This project doesn't auto-grant new tables to the API roles. Grant only
-- service_role (server-side key); anon/authenticated (the publishable key)
-- get no privileges at all, on top of RLS having no policies.

grant select, insert, update, delete on public.players to service_role;
grant select, insert on public.sheet_syncs to service_role;
grant usage on sequence public.sheet_syncs_id_seq to service_role;
