alter table public.voies
add column ordre integer;

with voies_ordonnees as (
  select
    voie.id,
    row_number() over (
      partition by voie.saison_id, relais.zone_id
      order by relais.numero, cotation.rang, voie.created_at, voie.id
    ) as ordre
  from public.voies voie
  join public.relais relais on relais.id = voie.relais_id
  join public.cotations cotation on cotation.id = voie.cotation_id
)
update public.voies voie
set ordre = voies_ordonnees.ordre
from voies_ordonnees
where voies_ordonnees.id = voie.id;

alter table public.voies
alter column ordre set not null,
add constraint voies_ordre_positif check (ordre > 0);

create index voies_saison_ordre_idx on public.voies(saison_id, ordre);

create or replace function private.imposer_saison_active_voie()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  select saison.id
  into new.saison_id
  from public.saisons saison
  where saison.active;

  if new.saison_id is null then
    raise exception 'Impossible d''ajouter une voie sans saison active.';
  end if;

  return new;
end;
$$;

create trigger voies_saison_active
before insert on public.voies
for each row execute function private.imposer_saison_active_voie();

alter table public.zones
drop constraint zones_ordre_key,
add constraint zones_ordre_key unique (ordre) deferrable initially immediate;

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
  if not (select private.est_admin()) then
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

revoke all on function public.modifier_zone(uuid, text, integer) from public, anon;
grant execute on function public.modifier_zone(uuid, text, integer) to authenticated;

alter table public.cotations
drop constraint cotations_rang_key,
add constraint cotations_rang_key unique (rang) deferrable initially immediate;

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
  if not (select private.est_admin()) then
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

revoke all on function public.modifier_cotation(uuid, text, integer) from public, anon;
grant execute on function public.modifier_cotation(uuid, text, integer) to authenticated;
