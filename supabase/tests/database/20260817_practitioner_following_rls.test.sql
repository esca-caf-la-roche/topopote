begin;

create extension if not exists pgtap with schema extensions;

select plan(53);

select ok(
  not has_table_privilege('anon', 'public.suivis_pratiquants', 'select'),
  'anon ne peut pas lire directement les relations de suivi'
);
select ok(
  not has_table_privilege('authenticated', 'public.suivis_pratiquants', 'select'),
  'authenticated ne peut pas lire directement les identifiants des relations'
);
select ok(
  not has_table_privilege('authenticated', 'public.suivis_pratiquants', 'insert'),
  'authenticated ne peut pas ajouter directement une relation'
);
select ok(
  not has_table_privilege('authenticated', 'public.suivis_pratiquants', 'delete'),
  'authenticated ne peut pas supprimer directement une relation'
);
select ok(
  not has_function_privilege('anon', 'public.annuaire_pratiquants()', 'execute'),
  'anon ne peut pas consulter l annuaire des pratiquants'
);
select ok(
  not has_function_privilege('anon', 'public.suivre_pratiquant(uuid,boolean)', 'execute'),
  'anon ne peut pas suivre un pratiquant'
);
select ok(
  not has_function_privilege('anon', 'public.fil_activite_pratiquants(integer)', 'execute'),
  'anon ne peut pas consulter le fil des pratiquants'
);
select ok(
  not has_function_privilege('anon', 'public.mes_pratiquants_suivis()', 'execute'),
  'anon ne peut pas consulter les resumes des profils suivis'
);
select ok(
  not has_function_privilege('anon', 'public.realisations_pratiquant_suivi(uuid)', 'execute'),
  'anon ne peut pas consulter les realisations detaillees d un suivi'
);
select ok(
  has_function_privilege('authenticated', 'public.annuaire_pratiquants()', 'execute'),
  'authenticated peut consulter l annuaire via le RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.suivre_pratiquant(uuid,boolean)', 'execute'),
  'authenticated peut gérer ses suivis via le RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.fil_activite_pratiquants(integer)', 'execute'),
  'authenticated peut consulter son fil via le RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.mes_pratiquants_suivis()', 'execute'),
  'authenticated peut consulter les resumes de ses suivis via le RPC'
);
select ok(
  has_function_privilege('authenticated', 'public.realisations_pratiquant_suivi(uuid)', 'execute'),
  'authenticated peut consulter les realisations d un suivi via le RPC'
);
select ok(
  not has_column_privilege('authenticated', 'public.profils', 'id_public', 'insert'),
  'authenticated ne peut pas choisir son identifiant social a la creation'
);
select ok(
  has_column_privilege('authenticated', 'public.profils', 'pseudo', 'insert'),
  'authenticated peut toujours creer son profil avec les colonnes applicatives'
);

insert into auth.users (
  id, aud, role, email, encrypted_password, email_confirmed_at, created_at, updated_at
) values
  ('00000000-0000-0000-0000-00000000d101', 'authenticated', 'authenticated', 'alice@following.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000d102', 'authenticated', 'authenticated', 'bob@following.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000d103', 'authenticated', 'authenticated', 'chloe@following.test', '', now(), now(), now()),
  ('00000000-0000-0000-0000-00000000d104', 'authenticated', 'authenticated', 'admin@following.test', '', now(), now(), now());

insert into public.administrateurs (user_id)
values ('00000000-0000-0000-0000-00000000d104');

update public.profils
set partage_activite = true
where user_id = '00000000-0000-0000-0000-00000000d104';

insert into public.profils (user_id, id_public, pseudo, partage_activite) values
  ('00000000-0000-0000-0000-00000000d101', '90000000-0000-0000-0000-00000000d101', 'Alice Test Suivi', true),
  ('00000000-0000-0000-0000-00000000d102', '90000000-0000-0000-0000-00000000d102', 'Bob Test Suivi', true),
  ('00000000-0000-0000-0000-00000000d103', '90000000-0000-0000-0000-00000000d103', 'Chloe Test Suivi', true);

insert into public.zones (id, nom, ordre)
values ('10000000-0000-0000-0000-00000000d101', '__test_suivi__', 31990);
insert into public.saisons (id, nom, active)
values ('20000000-0000-0000-0000-00000000d101', '__test_suivi__', true);
insert into public.relais (id, numero, zone_id)
values (
  '30000000-0000-0000-0000-00000000d101',
  31990,
  '10000000-0000-0000-0000-00000000d101'
);
insert into public.couleurs (id, nom, hex)
values
  ('40000000-0000-0000-0000-00000000d101', '__test_suivi_bleu__', '#1234ab'),
  ('40000000-0000-0000-0000-00000000d102', '__test_suivi_rouge__', '#ab3412');
insert into public.voies (id, saison_id, relais_id, couleur_id, cotation_id)
select
  donnees.id,
  '20000000-0000-0000-0000-00000000d101'::uuid,
  '30000000-0000-0000-0000-00000000d101'::uuid,
  donnees.couleur_id,
  cotation.id
from (
  values
    ('50000000-0000-0000-0000-00000000d101'::uuid, '40000000-0000-0000-0000-00000000d101'::uuid),
    ('50000000-0000-0000-0000-00000000d102'::uuid, '40000000-0000-0000-0000-00000000d102'::uuid)
) as donnees(id, couleur_id)
cross join public.cotations cotation
where cotation.libelle = '6a';

set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d103', true);

select lives_ok(
  $$select public.suivre_pratiquant('90000000-0000-0000-0000-00000000d101', true)$$,
  'Chloe suit Alice avant de rendre son profil prive'
);
select lives_ok(
  $$update public.profils
    set partage_activite = false
    where user_id = '00000000-0000-0000-0000-00000000d103'$$,
  'Chloe peut ensuite retirer son consentement de partage'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d101', true);

select results_eq(
  $$select pseudo, est_suivi, me_suit from public.annuaire_pratiquants()$$,
  $$values ('Bob Test Suivi'::text, false, false)$$,
  'l annuaire exclut les profils prives et l admin technique'
);
select throws_ok(
  $$select public.suivre_pratiquant('90000000-0000-0000-0000-00000000d103', true)$$,
  '22023',
  'Ce pratiquant n’accepte pas de nouveau suivi.',
  'une relation entrante existante ne permet pas un nouveau suivi apres retrait du partage'
);
select throws_ok(
  $$update public.profils
    set id_public = '90000000-0000-0000-0000-00000000d999'
    where user_id = '00000000-0000-0000-0000-00000000d101'$$,
  '23514',
  'L’identifiant social d’un profil ne peut pas être modifié.',
  'un pratiquant ne peut pas changer son identifiant social stable'
);
select throws_ok(
  $$select public.suivre_pratiquant('90000000-0000-0000-0000-00000000d101', true)$$,
  '22023',
  'Tu ne peux pas te suivre toi-même.',
  'un pratiquant ne peut pas se suivre lui meme'
);
select lives_ok(
  $$select public.suivre_pratiquant('90000000-0000-0000-0000-00000000d102', true)$$,
  'Alice peut suivre Bob'
);
select lives_ok(
  $$select public.suivre_pratiquant('90000000-0000-0000-0000-00000000d102', true)$$,
  'suivre deux fois le meme pratiquant reste idempotent'
);
select results_eq(
  $$select pseudo, est_suivi, me_suit
    from public.annuaire_pratiquants()
    where pseudo = 'Bob Test Suivi'$$,
  $$values ('Bob Test Suivi'::text, true, false)$$,
  'Alice sait qu elle suit Bob sans etre encore suivie par lui'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d102', true);

select results_eq(
  $$select pseudo, est_suivi, me_suit
    from public.annuaire_pratiquants()
    where pseudo = 'Alice Test Suivi'$$,
  $$values ('Alice Test Suivi'::text, false, true)$$,
  'Bob voit qu Alice le suit sans confondre le sens de la relation'
);
select lives_ok(
  $$select public.suivre_pratiquant('90000000-0000-0000-0000-00000000d101', true)$$,
  'Bob peut suivre Alice en retour'
);
select lives_ok(
  $$insert into public.enchainements (
      voie_id, saison_id, date_enchainement, style, essais,
      ressenti_cotation, note, recommande, commentaire
    ) values (
      '50000000-0000-0000-0000-00000000d101',
      '20000000-0000-0000-0000-00000000d101',
      current_date - 2,
      'apres_travail',
      3,
      'conforme',
      4,
      true,
      'Premier enchainement partage'
    )$$,
  'Bob enregistre un premier enchainement partage'
);
select lives_ok(
  $$insert into public.enchainements (
      voie_id, saison_id, date_enchainement, style, essais,
      ressenti_cotation, note, recommande, commentaire
    ) values (
      '50000000-0000-0000-0000-00000000d102',
      '20000000-0000-0000-0000-00000000d101',
      current_date - 1,
      'flash',
      1,
      'dure',
      5,
      false,
      'Dernier enchainement partage'
    )$$,
  'Bob enregistre un second enchainement partage'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d101', true);

select results_eq(
  $$select pseudo, est_suivi, me_suit
    from public.annuaire_pratiquants()
    where pseudo = 'Bob Test Suivi'$$,
  $$values ('Bob Test Suivi'::text, true, true)$$,
  'Alice distingue une relation reciproque dans les deux sens'
);
select results_eq(
  $$select pseudo, score, saison from public.mes_pratiquants_suivis()$$,
  $$select
      'Bob Test Suivi'::text,
      ((select cotation.points from public.cotations cotation where cotation.libelle = '6a') * 2 + 53)::bigint,
      '__test_suivi__'::text$$,
  'le resume du suivi utilise le score des dix meilleures voies de la saison active'
);
select results_eq(
  $$select pseudo, date_enchainement, style, commentaire, couleur
    from public.fil_activite_pratiquants()$$,
  $$values
    ('Bob Test Suivi'::text, current_date - 1, 'flash'::text, 'Dernier enchainement partage'::text, '__test_suivi_rouge__'::text),
    ('Bob Test Suivi'::text, current_date - 2, 'apres_travail'::text, 'Premier enchainement partage'::text, '__test_suivi_bleu__'::text)$$,
  'le fil affiche les enchainements des amis du plus recent au plus ancien'
);
select results_eq(
  $$select pseudo, date_enchainement, style, commentaire, couleur
    from public.realisations_pratiquant_suivi('90000000-0000-0000-0000-00000000d102')$$,
  $$values
    ('Bob Test Suivi'::text, current_date - 1, 'flash'::text, 'Dernier enchainement partage'::text, '__test_suivi_rouge__'::text),
    ('Bob Test Suivi'::text, current_date - 2, 'apres_travail'::text, 'Premier enchainement partage'::text, '__test_suivi_bleu__'::text)$$,
  'le detail cible toutes les realisations partagees du profil suivi'
);
select results_eq(
  $$select count(*)::bigint from public.fil_activite_pratiquants(1)$$,
  $$values (1::bigint)$$,
  'le fil respecte la limite demandee'
);
select lives_ok(
  $$select public.suivre_pratiquant('90000000-0000-0000-0000-00000000d102', false)$$,
  'Alice peut ne plus suivre Bob'
);
select results_eq(
  $$select count(*)::bigint from public.fil_activite_pratiquants()$$,
  $$values (0::bigint)$$,
  'desuivre retire immediatement les enchainements du fil'
);
select results_eq(
  $$select count(*)::bigint from public.mes_pratiquants_suivis()$$,
  $$values (0::bigint)$$,
  'desuivre retire immediatement la carte resume'
);
select results_eq(
  $$select count(*)::bigint from public.realisations_pratiquant_suivi('90000000-0000-0000-0000-00000000d102')$$,
  $$values (0::bigint)$$,
  'un profil non suivi ne peut pas etre interroge directement par son identifiant social'
);
select results_eq(
  $$select pseudo, est_suivi, me_suit
    from public.annuaire_pratiquants()
    where pseudo = 'Bob Test Suivi'$$,
  $$values ('Bob Test Suivi'::text, false, true)$$,
  'desuivre ne supprime pas le suivi de Bob vers Alice'
);
select lives_ok(
  $$select public.suivre_pratiquant('90000000-0000-0000-0000-00000000d102', true)$$,
  'Alice peut suivre Bob de nouveau'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d102', true);
select lives_ok(
  $$update public.profils
    set partage_activite = false
    where user_id = '00000000-0000-0000-0000-00000000d102'$$,
  'Bob peut retirer son consentement de partage'
);
select results_eq(
  $$select count(*)::bigint from public.annuaire_pratiquants()$$,
  $$values (0::bigint)$$,
  'un profil prive ne peut plus consulter l annuaire'
);
select results_eq(
  $$select count(*)::bigint from public.fil_activite_pratiquants()$$,
  $$values (0::bigint)$$,
  'un profil prive ne peut plus consulter le fil'
);
select results_eq(
  $$select count(*)::bigint from public.mes_pratiquants_suivis()$$,
  $$values (0::bigint)$$,
  'un profil prive ne peut plus consulter les resumes de ses suivis'
);
select results_eq(
  $$select count(*)::bigint from public.realisations_pratiquant_suivi('90000000-0000-0000-0000-00000000d101')$$,
  $$values (0::bigint)$$,
  'un profil prive ne peut plus consulter les realisations d un suivi'
);
select throws_ok(
  $$select public.suivre_pratiquant('90000000-0000-0000-0000-00000000d101', false)$$,
  '42501',
  'Active le partage de ton profil pour accéder à Potes.',
  'un profil prive ne peut plus modifier ses suivis'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d101', true);

select results_eq(
  $$select count(*)::bigint from public.fil_activite_pratiquants()$$,
  $$values (0::bigint)$$,
  'retirer partage activite masque immediatement tous les enchainements aux amis'
);
select results_eq(
  $$select pseudo, est_suivi, me_suit
    from public.annuaire_pratiquants()
    where pseudo = 'Bob Test Suivi'$$,
  $$select null::text, false, false where false$$,
  'retirer le partage masque immediatement le profil dans l annuaire'
);
select results_eq(
  $$select count(*)::bigint from public.mes_pratiquants_suivis()$$,
  $$values (0::bigint)$$,
  'retirer le partage masque immediatement la carte du profil suivi'
);
select results_eq(
  $$select count(*)::bigint from public.realisations_pratiquant_suivi('90000000-0000-0000-0000-00000000d102')$$,
  $$values (0::bigint)$$,
  'retirer le partage masque immediatement toutes les realisations detaillees'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d102', true);
select lives_ok(
  $$update public.profils
    set partage_activite = true
    where user_id = '00000000-0000-0000-0000-00000000d102'$$,
  'Bob peut reactiver son consentement de partage'
);

reset role;
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000d101', true);
select results_eq(
  $$select count(*)::bigint from public.fil_activite_pratiquants()$$,
  $$values (2::bigint)$$,
  'reactiver le partage restaure immediatement le fil sans recreer le suivi'
);
select results_eq(
  $$select count(*)::bigint from public.realisations_pratiquant_suivi('90000000-0000-0000-0000-00000000d102')$$,
  $$values (2::bigint)$$,
  'reactiver le partage restaure immediatement les realisations detaillees'
);

select * from finish();
rollback;
