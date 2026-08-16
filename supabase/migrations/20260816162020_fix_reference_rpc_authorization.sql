create or replace function public.modifier_zone(p_zone_id uuid, p_nom text, p_nouvel_ordre integer)
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

  select zone.ordre into ancien_ordre
  from public.zones zone
  where zone.id = p_zone_id;

  if ancien_ordre is null then
    raise exception 'Zone introuvable.';
  end if;

  select count(*) into nombre_zones from public.zones;
  nouvel_ordre := greatest(1, least(p_nouvel_ordre, nombre_zones));

  set constraints zones_ordre_key deferred;

  update public.zones zone
  set
    nom = case when zone.id = p_zone_id then trim(p_nom) else zone.nom end,
    ordre = case
      when zone.id = p_zone_id then nouvel_ordre
      when nouvel_ordre < ancien_ordre and zone.ordre >= nouvel_ordre and zone.ordre < ancien_ordre then zone.ordre + 1
      when nouvel_ordre > ancien_ordre and zone.ordre <= nouvel_ordre and zone.ordre > ancien_ordre then zone.ordre - 1
      else zone.ordre
    end;
end;
$$;

create or replace function public.modifier_cotation(p_cotation_id uuid, p_libelle text, p_nouveau_rang integer)
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

  select cotation.rang into ancien_rang
  from public.cotations cotation
  where cotation.id = p_cotation_id;

  if ancien_rang is null then
    raise exception 'Cotation introuvable.';
  end if;

  select count(*) into nombre_cotations from public.cotations;
  nouveau_rang := greatest(1, least(p_nouveau_rang, nombre_cotations));

  set constraints cotations_rang_key deferred;

  update public.cotations cotation
  set
    libelle = case when cotation.id = p_cotation_id then trim(p_libelle) else cotation.libelle end,
    rang = case
      when cotation.id = p_cotation_id then nouveau_rang
      when nouveau_rang < ancien_rang and cotation.rang >= nouveau_rang and cotation.rang < ancien_rang then cotation.rang + 1
      when nouveau_rang > ancien_rang and cotation.rang <= nouveau_rang and cotation.rang > ancien_rang then cotation.rang - 1
      else cotation.rang
    end;
end;
$$;

revoke all on function public.modifier_zone(uuid, text, integer) from public, anon;
grant execute on function public.modifier_zone(uuid, text, integer) to authenticated;
revoke all on function public.modifier_cotation(uuid, text, integer) from public, anon;
grant execute on function public.modifier_cotation(uuid, text, integer) to authenticated;
