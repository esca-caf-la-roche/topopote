drop trigger cotations_associer_difficulte on public.cotations;

create or replace function private.associer_difficulte_cotation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.difficulte is null then
    new.difficulte := private.difficulte_pour_cotation(new.libelle);
  end if;
  return new;
end;
$$;

create trigger cotations_associer_difficulte
before insert on public.cotations
for each row
execute function private.associer_difficulte_cotation();

drop function public.ajouter_cotation(text);

create function public.ajouter_cotation(p_libelle text, p_difficulte text)
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

drop function public.modifier_cotation(uuid, text, integer);

create function public.modifier_cotation(
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

revoke all on function public.ajouter_cotation(text, text) from public, anon;
grant execute on function public.ajouter_cotation(text, text) to authenticated;
revoke all on function public.modifier_cotation(uuid, text, integer, text) from public, anon;
grant execute on function public.modifier_cotation(uuid, text, integer, text) to authenticated;
