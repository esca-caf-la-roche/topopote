-- Destructive contract phase: deploy the compatible frontend FIRST, renew old
-- clients, back up and validate on a populated database before applying this.
-- Only training data is removed. Historical migrations remain unchanged.
begin;

drop trigger profils_proteger_acces_entrainement on public.profils;

-- The FK goes FROM voies_seance.enchainement_id TO enchainements.id
-- (ON DELETE SET NULL). Dropping the child table does not delete any ascents.
-- Table-local policies, indexes, constraints and triggers disappear with it.
drop table public.voies_seance;
drop table public.seances_entrainement;
drop table public.activites_charge;

drop function private.preparer_voie_seance();
drop function private.preparer_seance_entrainement();
drop function private.preparer_activite_charge();
drop function private.proteger_acces_entrainement();

alter table public.profils drop column acces_entrainement;

commit;
