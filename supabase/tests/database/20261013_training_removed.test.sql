begin;
create extension if not exists pgtap with schema extensions;
select plan(25);

select hasnt_table('public', 'seances_entrainement', 'Les séances sont supprimées');
select hasnt_table('public', 'voies_seance', 'Les voies de séance sont supprimées');
select hasnt_table('public', 'activites_charge', 'Les activités de charge sont supprimées');
select hasnt_column('public', 'profils', 'acces_entrainement', 'Le booléen privé est supprimé');
select hasnt_function('private', 'proteger_acces_entrainement', array[]::text[], 'La protection du booléen est supprimée');
select hasnt_function('private', 'preparer_seance_entrainement', array[]::text[], 'La préparation de séance est supprimée');
select hasnt_function('private', 'preparer_voie_seance', array[]::text[], 'La préparation de voie de séance est supprimée');
select hasnt_function('private', 'preparer_activite_charge', array[]::text[], 'La préparation de charge est supprimée');
select hasnt_trigger('public', 'profils', 'profils_proteger_acces_entrainement', 'Le profil ne garde aucun trigger entraînement');

-- Final-schema checks, not proof that historical rows survive an upgrade.
-- Populated upgrade validation is a separate mandatory release gate.
select has_table('public', 'profils', 'Les profils sont conservés');
select has_table('public', 'enchainements', 'Le carnet est conservé');
select ok((select relrowsecurity from pg_class where oid = 'public.profils'::regclass), 'RLS profils reste active');
select ok((select relrowsecurity from pg_class where oid = 'public.enchainements'::regclass), 'RLS carnet reste active');
-- A comma-separated privilege list means ANY privilege, not ALL.
select ok(has_table_privilege('authenticated', 'public.profils', 'select'), 'Lecture du profil sous RLS conservée');
-- Profile INSERT is deliberately column-scoped, not a table-wide grant.
select ok(has_column_privilege('authenticated', 'public.profils', 'user_id', 'insert'), 'Insertion du propriétaire du profil conservée');
select ok(has_column_privilege('authenticated', 'public.profils', 'pseudo', 'insert'), 'Insertion du pseudo conservée');
select ok(has_column_privilege('authenticated', 'public.profils', 'classement_public', 'insert'), 'Insertion du consentement classement conservée');
select ok(has_column_privilege('authenticated', 'public.profils', 'partage_activite', 'insert'), 'Insertion du consentement partage conservée');
select ok(not has_column_privilege('authenticated', 'public.profils', 'id_public', 'insert'), 'L’identifiant social reste généré exclusivement par la base');
select ok(has_table_privilege('authenticated', 'public.profils', 'update'), 'Modification du profil sous RLS conservée');
select ok(has_table_privilege('authenticated', 'public.enchainements', 'select'), 'Lecture du carnet sous RLS conservée');
select ok(has_table_privilege('authenticated', 'public.enchainements', 'insert'), 'Ajout au carnet sous RLS conservé');
select ok(has_table_privilege('authenticated', 'public.enchainements', 'update'), 'Modification du carnet sous RLS conservée');
select ok(has_table_privilege('authenticated', 'public.enchainements', 'delete'), 'Suppression du carnet sous RLS conservée');
select ok(not has_table_privilege('anon', 'public.enchainements', 'select'), 'Le carnet brut reste inaccessible au public');

select * from finish();
rollback;
