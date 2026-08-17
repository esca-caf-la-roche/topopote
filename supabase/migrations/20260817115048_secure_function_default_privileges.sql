-- Le runner de migrations Supabase utilise supabase_admin, tandis que les
-- tests pgTAP créent leurs fonctions avec postgres. Le premier REVOKE cible
-- le rôle qui applique la migration, puis supabase_admin peut prendre le rôle
-- postgres dont il est membre sur la plateforme Supabase.
alter default privileges in schema public
revoke execute on functions from public, anon, authenticated;

set local role postgres;

alter default privileges in schema public
revoke execute on functions from public, anon, authenticated;

reset role;
