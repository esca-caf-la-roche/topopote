drop index if exists public.voies_saison_ordre_idx;

alter table public.voies
drop constraint if exists voies_ordre_positif,
drop column if exists ordre;

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

  insert into public.zones (nom, ordre)
  select trim(p_nom), coalesce(max(zone.ordre), 0) + 1
  from public.zones zone
  returning id into nouvelle_zone_id;

  return nouvelle_zone_id;
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

create or replace function public.ajouter_cotation(p_libelle text)
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

  insert into public.cotations (libelle, rang)
  select trim(p_libelle), coalesce(max(cotation.rang), 0) + 1
  from public.cotations cotation
  returning id into nouvelle_cotation_id;

  return nouvelle_cotation_id;
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
revoke all on function public.supprimer_zone(uuid) from public, anon;
grant execute on function public.supprimer_zone(uuid) to authenticated;
revoke all on function public.ajouter_cotation(text) from public, anon;
grant execute on function public.ajouter_cotation(text) to authenticated;
revoke all on function public.supprimer_cotation(uuid) from public, anon;
grant execute on function public.supprimer_cotation(uuid) to authenticated;
