begin;

create extension if not exists pgtap with schema extensions;

select plan(41);

select results_eq(
  $$select fonction.proname
    from pg_proc fonction
    join pg_namespace schema_fonction on schema_fonction.oid = fonction.pronamespace
    where schema_fonction.nspname = 'public'
      and fonction.prokind = 'f'
      and fonction.prorettype <> 'trigger'::regtype
      and has_function_privilege('anon', fonction.oid, 'EXECUTE')
    order by fonction.proname$$,
  $$values ('classement_saison'::name)$$,
  'anon ne peut exécuter que le RPC public de classement'
);

select results_eq(
  $$select fonction.proname
    from pg_proc fonction
    join pg_namespace schema_fonction on schema_fonction.oid = fonction.pronamespace
    where schema_fonction.nspname = 'public'
      and fonction.prokind = 'f'
      and fonction.prorettype <> 'trigger'::regtype
      and has_function_privilege('authenticated', fonction.oid, 'EXECUTE')
    order by fonction.proname$$,
  $$values
    ('ajouter_cotation'::name),
    ('ajouter_zone'::name),
    ('annuaire_pratiquants'::name),
    ('avis_voie'::name),
    ('classement_saison'::name),
    ('fil_activite_pratiquants'::name),
    ('modifier_cotation'::name),
    ('modifier_zone'::name),
    ('retours_ouvreurs'::name),
    ('suivre_pratiquant'::name),
    ('supprimer_cotation'::name),
    ('supprimer_zone'::name)$$,
  'authenticated ne peut exécuter que les RPC explicitement prévues'
);

select ok(
  not has_table_privilege('anon', 'public.profils', 'select'),
  'anon ne peut pas lire directement les profils'
);
select ok(
  has_table_privilege('authenticated', 'public.profils', 'select'),
  'authenticated peut interroger son profil sous RLS'
);
select ok(
  has_function_privilege('anon', 'public.classement_saison(uuid)', 'execute'),
  'anon peut appeler uniquement le RPC public de classement'
);
select ok(
  not has_function_privilege('anon', 'public.avis_voie(uuid)', 'execute'),
  'anon ne peut pas lire les avis détaillés d’une voie'
);
select ok(
  has_function_privilege('authenticated', 'public.avis_voie(uuid)', 'execute'),
  'authenticated peut appeler le RPC ciblé des avis d’une voie'
);
select ok(
  not has_function_privilege('anon', 'public.retours_ouvreurs()', 'execute'),
  'anon ne peut pas appeler les retours destinés aux ouvreurs'
);
select ok(
  has_function_privilege('authenticated', 'public.retours_ouvreurs()', 'execute'),
  'authenticated peut atteindre le contrôle de rôle du RPC ouvreur'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-00000000a001', 'authenticated', 'authenticated', 'a@rls.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000b002', 'authenticated', 'authenticated', 'b@rls.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000c003', 'authenticated', 'authenticated', 'admin@rls.test', '', now(), now(), now());

insert into public.administrateurs (user_id)
values ('00000000-0000-0000-0000-00000000c003');

select results_eq(
  $$select count(*)::bigint from public.profils
    where user_id = '00000000-0000-0000-0000-00000000c003'
      and classement_public = false$$,
  $$values (1::bigint)$$,
  'un administrateur reçoit automatiquement un profil de carnet privé'
);

insert into public.zones (id, nom, ordre)
values ('10000000-0000-0000-0000-000000000001', '__test_rls__', 32000);
insert into public.relais (id, numero, zone_id)
values ('30000000-0000-0000-0000-000000000003', 32000, '10000000-0000-0000-0000-000000000001');
insert into public.couleurs (id, nom, hex)
values ('40000000-0000-0000-0000-000000000004', '__test_rls__', '#123456');

insert into public.saisons (id, nom, active)
values ('20000000-0000-0000-0000-000000000001', '__test_rls_historique__', true);
insert into public.voies (id, saison_id, relais_id, couleur_id, cotation_id)
select
  '50000000-0000-0000-0000-000000000004',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000004',
  cotation.id
from public.cotations cotation
where cotation.libelle = '6a';

insert into public.saisons (id, nom, active)
values ('20000000-0000-0000-0000-000000000002', '__test_rls__', true);
insert into public.voies (id, saison_id, relais_id, couleur_id, cotation_id)
select
  '50000000-0000-0000-0000-000000000005',
  '20000000-0000-0000-0000-000000000002',
  '30000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000004',
  cotation.id
from public.cotations cotation
where cotation.libelle = '6a';

insert into public.voies (id, saison_id, relais_id, couleur_id, cotation_id)
select
  '50000000-0000-0000-0000-000000000006',
  '20000000-0000-0000-0000-000000000001',
  '30000000-0000-0000-0000-000000000003',
  '40000000-0000-0000-0000-000000000004',
  cotation.id
from public.cotations cotation
where cotation.libelle = '6a';

select is(
  (select saison_id from public.voies where id = '50000000-0000-0000-0000-000000000006'),
  '20000000-0000-0000-0000-000000000002'::uuid,
  'une nouvelle voie est toujours rattachée à la saison active'
);

set local role anon;
select results_eq(
  $$select id from public.voies
    where id in (
      '50000000-0000-0000-0000-000000000004',
      '50000000-0000-0000-0000-000000000005',
      '50000000-0000-0000-0000-000000000006'
    )
    order by id$$,
  $$values
    ('50000000-0000-0000-0000-000000000005'::uuid),
    ('50000000-0000-0000-0000-000000000006'::uuid)$$,
  'anon lit la voie active mais pas la voie historique brute'
);

reset role;
set local role authenticated;
select results_eq(
  $$select id from public.voies
    where id in (
      '50000000-0000-0000-0000-000000000004',
      '50000000-0000-0000-0000-000000000005',
      '50000000-0000-0000-0000-000000000006'
    )
    order by id$$,
  $$values
    ('50000000-0000-0000-0000-000000000004'::uuid),
    ('50000000-0000-0000-0000-000000000005'::uuid),
    ('50000000-0000-0000-0000-000000000006'::uuid)$$,
  'authenticated conserve les voies historiques nécessaires aux carnets'
);

select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);

select lives_ok(
  $$insert into public.profils (user_id, pseudo) values ('00000000-0000-0000-0000-00000000a001', 'Grimpeur A')$$,
  'un pratiquant crée son propre profil'
);
select lives_ok(
  $$update public.profils set classement_public = true, partage_activite = true where user_id = '00000000-0000-0000-0000-00000000a001'$$,
  'les consentements au classement et au partage sont modifiables'
);
select throws_ok(
  $$insert into public.ouvreurs (user_id) values ('00000000-0000-0000-0000-00000000a001')$$,
  '42501',
  null,
  'un pratiquant ne peut pas se promouvoir ouvreur'
);
select throws_ok(
  $$insert into public.profils (user_id, pseudo) values ('00000000-0000-0000-0000-00000000b002', 'Profil usurpé')$$,
  '42501',
  null,
  'un pratiquant ne peut pas créer le profil d’un autre'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b002', true);

select results_eq(
  $$select count(*)::bigint from public.profils where user_id = '00000000-0000-0000-0000-00000000a001'$$,
  $$values (0::bigint)$$,
  'un profil public reste invisible directement aux autres pratiquants'
);
select lives_ok(
  $$insert into public.profils (user_id, pseudo) values ('00000000-0000-0000-0000-00000000b002', 'Grimpeur B')$$,
  'le second pratiquant crée son propre profil'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c003', true);
select lives_ok(
  $$insert into public.ouvreurs (user_id) values ('00000000-0000-0000-0000-00000000a001')$$,
  'un administrateur peut promouvoir un pratiquant ouvreur'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
select results_eq(
  $$select count(*)::bigint from public.ouvreurs where user_id = '00000000-0000-0000-0000-00000000a001'$$,
  $$values (1::bigint)$$,
  'un ouvreur peut lire son propre rôle'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b002', true);
select results_eq(
  $$select count(*)::bigint from public.ouvreurs$$,
  $$values (0::bigint)$$,
  'un pratiquant ne voit pas les rôles des autres comptes'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);

select lives_ok(
  $$insert into public.enchainements (user_id, voie_id, saison_id, date_enchainement, style, essais, ressenti_cotation, note, commentaire)
    values (
      '00000000-0000-0000-0000-00000000b002',
      '50000000-0000-0000-0000-000000000005',
      '20000000-0000-0000-0000-000000000002',
      current_date,
      'a_vue',
      1,
      'dure',
      4,
      'Très belle voie'
    )$$,
  'un enchaînement valide peut être créé'
);

reset role;
select is(
  (select user_id from public.enchainements where voie_id = '50000000-0000-0000-0000-000000000005'),
  '00000000-0000-0000-0000-00000000a001'::uuid,
  'le trigger remplace tout user_id usurpé par auth.uid()'
);
select is(
  (select saison_id from public.enchainements where voie_id = '50000000-0000-0000-0000-000000000005'),
  '20000000-0000-0000-0000-000000000002'::uuid,
  'le trigger impose la saison canonique de la voie'
);

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
select results_eq(
  $$select moyenne_note, nombre_notes, nombre_recommandations, nombre_enchainements, nombre_commentaires
    from public.retours_ouvreurs()
    where voie_id = '50000000-0000-0000-0000-000000000005'$$,
  $$values (4.00::numeric, 1::bigint, 0::bigint, 1::bigint, 1::bigint)$$,
  'un ouvreur reçoit les agrégats consentis de la voie'
);
select results_eq(
  $$select commentaires from public.retours_ouvreurs()
    where voie_id = '50000000-0000-0000-0000-000000000005'$$,
  $$values (array['Très belle voie']::text[])$$,
  'les commentaires consentis sont transmis sans identité'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b002', true);
select throws_ok(
  $$select * from public.retours_ouvreurs()$$,
  '42501',
  null,
  'un pratiquant sans rôle ne peut pas consulter les retours ouvreurs'
);
select results_eq(
  $$select count(*)::bigint from public.enchainements$$,
  $$values (0::bigint)$$,
  'un pratiquant ne lit pas le carnet d’un autre'
);
select results_eq(
  $$update public.enchainements set commentaire = 'intrusion' returning id$$,
  $$select null::uuid where false$$,
  'un pratiquant ne modifie pas le carnet d’un autre'
);
select results_eq(
  $$delete from public.enchainements returning id$$,
  $$select null::uuid where false$$,
  'un pratiquant ne supprime pas le carnet d’un autre'
);
select results_eq(
  $$select pseudo, est_moi, style, ressenti_cotation, note, commentaire
    from public.avis_voie('50000000-0000-0000-0000-000000000005')$$,
  $$values ('Grimpeur A'::text, false, 'a_vue'::text, 'dure'::text, 4::smallint, 'Très belle voie'::text)$$,
  'un pratiquant voit uniquement le résumé consenti d’un autre pratiquant'
);
select results_eq(
  $$select count(*)::bigint from public.avis_voie('50000000-0000-0000-0000-000000000099')$$,
  $$values (0::bigint)$$,
  'le RPC reste strictement filtré sur la voie demandée'
);

reset role;
update public.profils
set partage_activite = false
where user_id = '00000000-0000-0000-0000-00000000a001';
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000b002', true);
select results_eq(
  $$select count(*)::bigint from public.avis_voie('50000000-0000-0000-0000-000000000005')$$,
  $$values (0::bigint)$$,
  'le retrait du consentement masque immédiatement l’enchaînement aux autres pratiquants'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000a001', true);
select results_eq(
  $$select nombre_enchainements, nombre_commentaires from public.retours_ouvreurs()
    where voie_id = '50000000-0000-0000-0000-000000000005'$$,
  $$values (1::bigint, 1::bigint)$$,
  'la page ouvreur ignore le consentement de partage communautaire'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c003', true);
select results_eq(
  $$select nombre_enchainements, nombre_commentaires from public.retours_ouvreurs()
    where voie_id = '50000000-0000-0000-0000-000000000005'$$,
  $$values (1::bigint, 1::bigint)$$,
  'un administrateur voit aussi tous les retours sur la page ouvreur'
);

reset role;
update public.profils
set partage_activite = true
where user_id = '00000000-0000-0000-0000-00000000a001';

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c003', true);
select results_eq(
  $$select count(*)::bigint from public.enchainements
    where voie_id = '50000000-0000-0000-0000-000000000005'$$,
  $$values (1::bigint)$$,
  'un administrateur peut contrôler les carnets'
);
select results_eq(
  $$select count(*)::bigint from public.retours_ouvreurs()
    where voie_id = '50000000-0000-0000-0000-000000000005'$$,
  $$values (1::bigint)$$,
  'un administrateur peut consulter la page de retours sans rôle ouvreur'
);

reset role;
set local role anon;
select set_config('request.jwt.claim.sub', '', true);
select results_eq(
  $$select count(*)::bigint from public.classement_saison('20000000-0000-0000-0000-000000000002')$$,
  $$values (1::bigint)$$,
  'le RPC anonyme retourne uniquement les profils ayant consenti'
);
select results_eq(
  $$select score from public.classement_saison('20000000-0000-0000-0000-000000000002')$$,
  $$values (547::bigint)$$,
  'le RPC applique 400 points pour 6a et le bonus à vue de 147 points'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000c003', true);
select throws_ok(
  $$delete from public.voies where id = '50000000-0000-0000-0000-000000000005'$$,
  '23503',
  null,
  'une voie utilisée par un carnet ne peut pas être supprimée en cascade'
);

select * from finish();
rollback;
