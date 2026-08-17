drop policy "Lecture publique des voies" on public.voies;

create policy "Lecture publique des voies actives"
on public.voies for select
to anon
using (
  exists (
    select 1
    from public.saisons saison
    where saison.id = voies.saison_id
      and saison.active
  )
);

create policy "Lecture authentifiée des voies"
on public.voies for select
to authenticated
using (true);

create or replace function public.ajouter_zone(p_nom text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  nouvelle_zone_id uuid;
begin
  if not exists (
    select 1
    from public.administrateurs administrateur
    where administrateur.user_id = (select auth.uid())
  ) then
    raise exception 'Accès administrateur requis.' using errcode = '42501';
  end if;

  -- Clé stable et partagée par toutes les écritures qui modifient zones.ordre.
  perform pg_catalog.pg_advisory_xact_lock(846201, 1);

  insert into public.zones (nom, ordre)
  select trim(p_nom), coalesce(max(zone.ordre), 0) + 1
  from public.zones zone
  returning id into nouvelle_zone_id;

  return nouvelle_zone_id;
end;
$$;

create or replace function public.modifier_zone(
  p_zone_id uuid,
  p_nom text,
  p_nouvel_ordre integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ancien_ordre integer;
  nouvel_ordre integer;
  nombre_zones integer;
begin
  if not exists (
    select 1
    from public.administrateurs administrateur
    where administrateur.user_id = (select auth.uid())
  ) then
    raise exception 'Accès administrateur requis.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(846201, 1);

  select zone.ordre into ancien_ordre
  from public.zones zone
  where zone.id = p_zone_id;

  if ancien_ordre is null then
    raise exception 'Zone introuvable.';
  end if;

  select count(*) into nombre_zones from public.zones;
  nouvel_ordre := greatest(1, least(p_nouvel_ordre, nombre_zones));

  set constraints public.zones_ordre_key deferred;

  update public.zones zone
  set
    nom = case when zone.id = p_zone_id then trim(p_nom) else zone.nom end,
    ordre = case
      when zone.id = p_zone_id then nouvel_ordre
      when nouvel_ordre < ancien_ordre then zone.ordre + 1
      when nouvel_ordre > ancien_ordre then zone.ordre - 1
      else zone.ordre
    end
  where zone.id = p_zone_id
    or (nouvel_ordre < ancien_ordre and zone.ordre >= nouvel_ordre and zone.ordre < ancien_ordre)
    or (nouvel_ordre > ancien_ordre and zone.ordre <= nouvel_ordre and zone.ordre > ancien_ordre);
end;
$$;

create or replace function public.supprimer_zone(p_zone_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ancien_ordre integer;
begin
  if not exists (
    select 1
    from public.administrateurs administrateur
    where administrateur.user_id = (select auth.uid())
  ) then
    raise exception 'Accès administrateur requis.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(846201, 1);

  select zone.ordre into ancien_ordre
  from public.zones zone
  where zone.id = p_zone_id;

  if ancien_ordre is null then
    raise exception 'Zone introuvable.';
  end if;

  set constraints public.zones_ordre_key deferred;
  delete from public.zones zone where zone.id = p_zone_id;
  update public.zones zone set ordre = zone.ordre - 1 where zone.ordre > ancien_ordre;
end;
$$;

create or replace function public.ajouter_cotation(p_libelle text, p_difficulte text)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  nouvelle_cotation_id uuid;
begin
  if not exists (
    select 1
    from public.administrateurs administrateur
    where administrateur.user_id = (select auth.uid())
  ) then
    raise exception 'Accès administrateur requis.' using errcode = '42501';
  end if;

  -- Clé distincte et stable pour toutes les écritures qui modifient cotations.rang.
  perform pg_catalog.pg_advisory_xact_lock(846201, 2);

  insert into public.cotations (libelle, rang, difficulte)
  values (
    trim(p_libelle),
    (select coalesce(max(cotation.rang), 0) + 1 from public.cotations cotation),
    p_difficulte
  )
  returning id into nouvelle_cotation_id;

  return nouvelle_cotation_id;
end;
$$;

create or replace function public.modifier_cotation(
  p_cotation_id uuid,
  p_libelle text,
  p_nouveau_rang integer,
  p_difficulte text
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ancien_rang integer;
  nouveau_rang integer;
  nombre_cotations integer;
begin
  if not exists (
    select 1
    from public.administrateurs administrateur
    where administrateur.user_id = (select auth.uid())
  ) then
    raise exception 'Accès administrateur requis.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(846201, 2);

  select cotation.rang into ancien_rang
  from public.cotations cotation
  where cotation.id = p_cotation_id;

  if ancien_rang is null then
    raise exception 'Cotation introuvable.';
  end if;

  select count(*) into nombre_cotations from public.cotations;
  nouveau_rang := greatest(1, least(p_nouveau_rang, nombre_cotations));

  set constraints public.cotations_rang_key deferred;

  update public.cotations cotation
  set
    libelle = case when cotation.id = p_cotation_id then trim(p_libelle) else cotation.libelle end,
    difficulte = case when cotation.id = p_cotation_id then p_difficulte else cotation.difficulte end,
    rang = case
      when cotation.id = p_cotation_id then nouveau_rang
      when nouveau_rang < ancien_rang then cotation.rang + 1
      when nouveau_rang > ancien_rang then cotation.rang - 1
      else cotation.rang
    end
  where cotation.id = p_cotation_id
    or (nouveau_rang < ancien_rang and cotation.rang >= nouveau_rang and cotation.rang < ancien_rang)
    or (nouveau_rang > ancien_rang and cotation.rang <= nouveau_rang and cotation.rang > ancien_rang);
end;
$$;

create or replace function public.supprimer_cotation(p_cotation_id uuid)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  ancien_rang integer;
begin
  if not exists (
    select 1
    from public.administrateurs administrateur
    where administrateur.user_id = (select auth.uid())
  ) then
    raise exception 'Accès administrateur requis.' using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(846201, 2);

  select cotation.rang into ancien_rang
  from public.cotations cotation
  where cotation.id = p_cotation_id;

  if ancien_rang is null then
    raise exception 'Cotation introuvable.';
  end if;

  set constraints public.cotations_rang_key deferred;
  delete from public.cotations cotation where cotation.id = p_cotation_id;
  update public.cotations cotation set rang = cotation.rang - 1 where cotation.rang > ancien_rang;
end;
$$;

revoke all on function public.ajouter_zone(text) from public, anon;
grant execute on function public.ajouter_zone(text) to authenticated;
revoke all on function public.modifier_zone(uuid, text, integer) from public, anon;
grant execute on function public.modifier_zone(uuid, text, integer) to authenticated;
revoke all on function public.supprimer_zone(uuid) from public, anon;
grant execute on function public.supprimer_zone(uuid) to authenticated;

revoke all on function public.ajouter_cotation(text, text) from public, anon;
grant execute on function public.ajouter_cotation(text, text) to authenticated;
revoke all on function public.modifier_cotation(uuid, text, integer, text) from public, anon;
grant execute on function public.modifier_cotation(uuid, text, integer, text) to authenticated;
revoke all on function public.supprimer_cotation(uuid) from public, anon;
grant execute on function public.supprimer_cotation(uuid) to authenticated;

-- Les futures fonctions ne deviennent plus des RPC publiques par défaut.
alter default privileges in schema public
revoke execute on functions from public, anon, authenticated;
