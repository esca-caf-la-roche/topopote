drop policy "Gestion admin des zones" on public.zones;
drop policy "Gestion admin des saisons" on public.saisons;
drop policy "Gestion admin des relais" on public.relais;
drop policy "Gestion admin des couleurs" on public.couleurs;
drop policy "Gestion admin des cotations" on public.cotations;
drop policy "Gestion admin des voies" on public.voies;

create policy "Ajout admin des zones" on public.zones for insert to authenticated with check ((select private.est_admin()));
create policy "Modification admin des zones" on public.zones for update to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Suppression admin des zones" on public.zones for delete to authenticated using ((select private.est_admin()));

create policy "Ajout admin des saisons" on public.saisons for insert to authenticated with check ((select private.est_admin()));
create policy "Modification admin des saisons" on public.saisons for update to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Suppression admin des saisons" on public.saisons for delete to authenticated using ((select private.est_admin()));

create policy "Ajout admin des relais" on public.relais for insert to authenticated with check ((select private.est_admin()));
create policy "Modification admin des relais" on public.relais for update to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Suppression admin des relais" on public.relais for delete to authenticated using ((select private.est_admin()));

create policy "Ajout admin des couleurs" on public.couleurs for insert to authenticated with check ((select private.est_admin()));
create policy "Modification admin des couleurs" on public.couleurs for update to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Suppression admin des couleurs" on public.couleurs for delete to authenticated using ((select private.est_admin()));

create policy "Ajout admin des cotations" on public.cotations for insert to authenticated with check ((select private.est_admin()));
create policy "Modification admin des cotations" on public.cotations for update to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Suppression admin des cotations" on public.cotations for delete to authenticated using ((select private.est_admin()));

create policy "Ajout admin des voies" on public.voies for insert to authenticated with check ((select private.est_admin()));
create policy "Modification admin des voies" on public.voies for update to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Suppression admin des voies" on public.voies for delete to authenticated using ((select private.est_admin()));
