drop policy "Gestion admin des ouvreurs" on public.ouvreurs;

create policy "Ajout admin des ouvreurs"
on public.ouvreurs for insert
to authenticated
with check ((select private.est_admin()));

create policy "Suppression admin des ouvreurs"
on public.ouvreurs for delete
to authenticated
using ((select private.est_admin()));
