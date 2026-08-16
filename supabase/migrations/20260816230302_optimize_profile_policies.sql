drop policy "Lecture de son profil" on public.profils;
drop policy "Création de son profil" on public.profils;
drop policy "Modification de son profil" on public.profils;
drop policy "Gestion admin des profils" on public.profils;

create policy "Lecture de son profil ou gestion admin"
on public.profils for select
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.est_admin())
);

create policy "Création de son profil"
on public.profils for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Modification de son profil ou gestion admin"
on public.profils for update
to authenticated
using (
  user_id = (select auth.uid())
  or (select private.est_admin())
)
with check (
  user_id = (select auth.uid())
  or (select private.est_admin())
);

create policy "Suppression admin des profils"
on public.profils for delete
to authenticated
using ((select private.est_admin()));
