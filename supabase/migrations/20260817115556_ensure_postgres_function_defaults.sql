-- `supabase db reset/start` rejoue les migrations avec supabase_admin, alors
-- que pgTAP ouvre ensuite sa connexion avec postgres. SET ROLE (non LOCAL)
-- rend le changement effectif même lorsque chaque fichier n'est pas englobé
-- dans une transaction explicite.
set role postgres;

alter default privileges in schema public
revoke execute on functions from public, anon, authenticated;

reset role;
