-- Simplifie le suivi autour du guide : temps x RPE, doigts et douleur.

alter table public.seances_entrainement
  add column contrainte_doigts text
    check (contrainte_doigts in ('faible', 'moyenne', 'forte')),
  add column douleur smallint
    check (douleur between 0 and 10);

alter table public.activites_charge
  add column contrainte_doigts text
    check (contrainte_doigts in ('faible', 'moyenne', 'forte')),
  add column douleur smallint
    check (douleur between 0 and 10);

update public.seances_entrainement set effort_percu = 1 where effort_percu = 0;
update public.activites_charge set effort_percu = 1 where effort_percu = 0;

alter table public.seances_entrainement
  drop constraint seances_entrainement_effort_percu_check,
  add constraint seances_entrainement_effort_percu_check
    check (effort_percu between 1 and 10),
  drop column sensations,
  drop column plaisir,
  drop column fatigue_apres;

alter table public.activites_charge
  drop constraint activites_charge_effort_percu_check,
  add constraint activites_charge_effort_percu_check
    check (effort_percu between 1 and 10),
  drop constraint activites_charge_type_activite_check,
  add constraint activites_charge_type_activite_check
    check (type_activite in (
      'bloc_interieur', 'bloc_exterieur', 'poutre', 'ppg', 'cardio',
      'renforcement', 'course', 'randonnee', 'competition', 'autre'
    ));

comment on column public.seances_entrainement.contrainte_doigts is
  'Contrainte locale ressentie sur les doigts : faible, moyenne ou forte.';
comment on column public.seances_entrainement.douleur is
  'Douleur déclarée de 0 (non) à 10 (maximale), indépendante de la charge.';
comment on column public.activites_charge.contrainte_doigts is
  'Contrainte locale ressentie sur les doigts : faible, moyenne ou forte.';
comment on column public.activites_charge.douleur is
  'Douleur déclarée de 0 (non) à 10 (maximale), indépendante de la charge.';
