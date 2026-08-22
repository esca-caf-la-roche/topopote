alter table public.seances_entrainement
  add column heure_debut time,
  add column heure_fin time,
  add constraint seances_entrainement_horaires_coherents_check
    check (
      heure_fin is null
      or (heure_debut is not null and heure_fin <> heure_debut)
    );

comment on column public.seances_entrainement.heure_debut is
  'Heure locale facultative de début, conservée pour compléter la séance plus tard.';
comment on column public.seances_entrainement.heure_fin is
  'Heure locale facultative de fin, renseignée uniquement avec une heure de début.';
