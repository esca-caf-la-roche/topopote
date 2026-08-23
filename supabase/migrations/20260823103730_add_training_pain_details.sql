-- Précise une douleur déclarée sans modifier le calcul de charge de la séance.

alter table public.seances_entrainement
  add column zone_douleur text,
  add column type_douleur text,
  add constraint seances_entrainement_zone_douleur_check
    check (
      zone_douleur is null
      or (zone_douleur = btrim(zone_douleur) and char_length(zone_douleur) between 1 and 100)
    ),
  add constraint seances_entrainement_type_douleur_check
    check (
      type_douleur is null
      or type_douleur in (
        'sourde', 'elancement', 'tiraillement', 'pincement', 'brulure',
        'decharge_electrique', 'fourmillement_engourdissement', 'raideur',
        'sensibilite_toucher', 'autre'
      )
    ),
  add constraint seances_entrainement_details_douleur_check
    check (coalesce(douleur > 0, false) or (zone_douleur is null and type_douleur is null));

alter table public.activites_charge
  add column zone_douleur text,
  add column type_douleur text,
  add constraint activites_charge_zone_douleur_check
    check (
      zone_douleur is null
      or (zone_douleur = btrim(zone_douleur) and char_length(zone_douleur) between 1 and 100)
    ),
  add constraint activites_charge_type_douleur_check
    check (
      type_douleur is null
      or type_douleur in (
        'sourde', 'elancement', 'tiraillement', 'pincement', 'brulure',
        'decharge_electrique', 'fourmillement_engourdissement', 'raideur',
        'sensibilite_toucher', 'autre'
      )
    ),
  add constraint activites_charge_details_douleur_check
    check (coalesce(douleur > 0, false) or (zone_douleur is null and type_douleur is null));

comment on column public.seances_entrainement.zone_douleur is
  'Partie du corps concernée par la douleur, saisie librement par le pratiquant.';
comment on column public.seances_entrainement.type_douleur is
  'Type de douleur choisi dans la liste proposée par le carnet.';
comment on column public.activites_charge.zone_douleur is
  'Partie du corps concernée par la douleur, saisie librement par le pratiquant.';
comment on column public.activites_charge.type_douleur is
  'Type de douleur choisi dans la liste proposée par le carnet.';
