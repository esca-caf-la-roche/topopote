alter table public.seances_entrainement
  add column sensations smallint check (sensations between 1 and 5),
  add column plaisir smallint check (plaisir between 1 and 5),
  add column fatigue_apres smallint check (fatigue_apres between 1 and 5);

comment on column public.seances_entrainement.sensations is
  'Note personnelle facultative de 1 à 5 sur les sensations pendant la séance.';
comment on column public.seances_entrainement.plaisir is
  'Note personnelle facultative de 1 à 5 sur le plaisir pendant la séance.';
comment on column public.seances_entrainement.fatigue_apres is
  'Note personnelle facultative de 1 à 5 sur la fatigue après la séance, de frais à épuisé.';
