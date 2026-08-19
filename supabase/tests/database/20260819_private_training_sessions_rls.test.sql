begin;

create extension if not exists pgtap with schema extensions;

select plan(27);

select ok(
  not has_table_privilege('anon', 'public.seances_entrainement', 'select'),
  'anon ne peut pas lire les séances privées'
);
select ok(
  not has_table_privilege('anon', 'public.voies_seance', 'select'),
  'anon ne peut pas lire les voies des séances privées'
);
select ok(
  has_table_privilege('authenticated', 'public.seances_entrainement', 'select,insert,update,delete'),
  'authenticated possède les opérations filtrées par RLS sur ses séances'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-00000000d001', 'authenticated', 'authenticated', 'training-a@rls.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000d002', 'authenticated', 'authenticated', 'training-b@rls.test', '', now(), now(), now());

insert into public.profils (user_id, pseudo)
values
  ('00000000-0000-0000-0000-00000000d001', 'Training A'),
  ('00000000-0000-0000-0000-00000000d002', 'Training B');

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d001', true);

select throws_ok(
  $$insert into public.seances_entrainement (user_id, date_seance, type_lieu)
    values ('00000000-0000-0000-0000-00000000d001', current_date, 'mur')$$,
  '42501',
  null,
  'un profil sans accès ne peut pas créer de séance'
);
select throws_ok(
  $$update public.profils set acces_entrainement = true
    where user_id = '00000000-0000-0000-0000-00000000d001'$$,
  '42501',
  null,
  'le client ne peut pas activer lui-même son accès'
);

reset role;
select set_config('request.jwt.claim.sub', '', true);
update public.profils
set acces_entrainement = true
where user_id = '00000000-0000-0000-0000-00000000d001';

insert into public.zones (id, nom, ordre)
values ('10000000-0000-0000-0000-00000000d001', '__training__', 31000);
insert into public.relais (id, numero, zone_id)
values ('30000000-0000-0000-0000-00000000d001', 31000, '10000000-0000-0000-0000-00000000d001');
insert into public.couleurs (id, nom, hex)
values ('40000000-0000-0000-0000-00000000d001', '__training__', '#123456');
insert into public.saisons (id, nom, active)
values ('20000000-0000-0000-0000-00000000d001', '__training__', true);
insert into public.voies (id, saison_id, relais_id, couleur_id, cotation_id)
select
  '50000000-0000-0000-0000-00000000d001',
  '20000000-0000-0000-0000-00000000d001',
  '30000000-0000-0000-0000-00000000d001',
  '40000000-0000-0000-0000-00000000d001',
  cotation.id
from public.cotations cotation
where cotation.libelle = '6a';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d001', true);

select lives_ok(
  $$insert into public.seances_entrainement (id, user_id, date_seance, type_lieu)
    values (
      '60000000-0000-0000-0000-00000000d001',
      '00000000-0000-0000-0000-00000000d002',
      current_date,
      'mur'
    )$$,
  'le propriétaire autorisé crée une séance au mur'
);
select is(
  (select user_id from public.seances_entrainement where id = '60000000-0000-0000-0000-00000000d001'),
  '00000000-0000-0000-0000-00000000d001'::uuid,
  'le trigger remplace un propriétaire de séance usurpé'
);
select lives_ok(
  $$insert into public.voies_seance (id, seance_id, voie_id, nombre_essais)
    values (
      '70000000-0000-0000-0000-00000000d001',
      '60000000-0000-0000-0000-00000000d001',
      '50000000-0000-0000-0000-00000000d001',
      3
    )$$,
  'une voie non enchaînée conserve ses essais'
);
select lives_ok(
  $$update public.seances_entrainement
    set sensations = 4, plaisir = 5, fatigue_apres = 3
    where id = '60000000-0000-0000-0000-00000000d001'$$,
  'le propriétaire peut noter sa séance'
);
select results_eq(
  $$select sensations, plaisir, fatigue_apres
    from public.seances_entrainement
    where id = '60000000-0000-0000-0000-00000000d001'$$,
  $$values (4::smallint, 5::smallint, 3::smallint)$$,
  'les trois notes de séance sont conservées'
);
select throws_ok(
  $$update public.seances_entrainement
    set fatigue_apres = 6
    where id = '60000000-0000-0000-0000-00000000d001'$$,
  '23514',
  null,
  'une note hors de la plage 1 à 5 est refusée'
);
select throws_ok(
  $$insert into public.voies_seance (seance_id, nom_voie, cotation, nombre_essais)
    values ('60000000-0000-0000-0000-00000000d001', 'Fausse voie', '6a', 1)$$,
  '23514',
  null,
  'une séance au mur refuse une voie extérieure libre'
);
select lives_ok(
  $$insert into public.seances_entrainement (id, user_id, date_seance, type_lieu, falaise)
    values (
      '60000000-0000-0000-0000-00000000d002',
      '00000000-0000-0000-0000-00000000d001',
      current_date,
      'exterieur',
      'Le Salève'
    )$$,
  'une séance extérieure valide peut être créée'
);
select lives_ok(
  $$insert into public.voies_seance (seance_id, nom_voie, cotation, nombre_essais, enchainee, style, commentaire)
    values (
      '60000000-0000-0000-0000-00000000d002',
      'La directe',
      '6b',
      4,
      true,
      'apres_travail',
      '  Très belle voie.  '
    )$$,
  'une voie extérieure enchaînée conserve cotation, essais et style'
);
select is(
  (select commentaire from public.voies_seance
    where seance_id = '60000000-0000-0000-0000-00000000d002'
      and nom_voie = 'La directe'),
  'Très belle voie.',
  'le commentaire extérieur est nettoyé et conservé'
);
select throws_ok(
  $$insert into public.voies_seance (seance_id, nom_voie, nombre_essais)
    values ('60000000-0000-0000-0000-00000000d002', 'Sans cotation', 1)$$,
  '23514',
  null,
  'une voie extérieure sans cotation est refusée'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d002', true);

select results_eq(
  $$select count(*)::bigint from public.seances_entrainement$$,
  $$values (0::bigint)$$,
  'un autre pratiquant ne lit aucune séance privée'
);
select results_eq(
  $$select count(*)::bigint from public.voies_seance$$,
  $$values (0::bigint)$$,
  'un autre pratiquant ne lit aucune voie privée'
);
select results_eq(
  $$update public.seances_entrainement set sensations = 1 returning id$$,
  $$select null::uuid where false$$,
  'un autre pratiquant ne modifie aucune séance privée'
);
select results_eq(
  $$delete from public.voies_seance returning id$$,
  $$select null::uuid where false$$,
  'un autre pratiquant ne supprime aucune voie privée'
);
select results_eq(
  $$update public.voies_seance set commentaire = 'Intrusion' returning id$$,
  $$select null::uuid where false$$,
  'un autre pratiquant ne modifie aucun commentaire privé'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d001', true);

select lives_ok(
  $$update public.voies_seance
    set enchainee = true, style = 'apres_travail'
    where id = '70000000-0000-0000-0000-00000000d001'$$,
  'la voie peut être marquée enchaînée avant la saisie du modal'
);
select lives_ok(
  $$insert into public.enchainements (
      id, user_id, voie_id, saison_id, date_enchainement, style, essais
    ) values (
      '80000000-0000-0000-0000-00000000d001',
      '00000000-0000-0000-0000-00000000d002',
      '50000000-0000-0000-0000-00000000d001',
      '20000000-0000-0000-0000-00000000d001',
      current_date,
      'apres_travail',
      3
    )$$,
  'le modal peut créer le premier enchaînement du propriétaire'
);
select lives_ok(
  $$update public.voies_seance
    set enchainement_id = '80000000-0000-0000-0000-00000000d001'
    where id = '70000000-0000-0000-0000-00000000d001'$$,
  'la ligne de séance peut être reliée à son enchaînement correspondant'
);
select is(
  (select enchainement_id from public.voies_seance
    where id = '70000000-0000-0000-0000-00000000d001'),
  '80000000-0000-0000-0000-00000000d001'::uuid,
  'la liaison du modal reste enregistrée sur la voie de séance'
);
select lives_ok(
  $$delete from public.seances_entrainement
    where id = '60000000-0000-0000-0000-00000000d002'$$,
  'le propriétaire peut supprimer sa séance extérieure'
);
select results_eq(
  $$select count(*)::bigint from public.voies_seance
    where seance_id = '60000000-0000-0000-0000-00000000d002'$$,
  $$values (0::bigint)$$,
  'supprimer une séance supprime ses lignes en cascade'
);

select * from finish();
rollback;
