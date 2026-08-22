-- Retire le suivi local des doigts, abandonné au profit du temps, de la RPE et de la douleur.

alter table public.seances_entrainement
  drop column contrainte_doigts;

alter table public.activites_charge
  drop column contrainte_doigts;
