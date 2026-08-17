alter table public.profils
  add column partage_activite boolean not null default false;

create or replace function private.preparer_enchainement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  saison_de_la_voie uuid;
begin
  select voie.saison_id into saison_de_la_voie
  from public.voies voie
  where voie.id = new.voie_id;

  if saison_de_la_voie is null then
    raise exception 'Voie introuvable.' using errcode = '23503';
  end if;

  if tg_op = 'INSERT' then
    new.user_id := (select auth.uid());
  else
    new.user_id := old.user_id;
  end if;

  if not exists (
    select 1 from public.profils profil where profil.user_id = new.user_id
  ) then
    raise exception 'Crée ton profil pratiquant avant d’enregistrer une voie.' using errcode = '23503';
  end if;

  new.saison_id := saison_de_la_voie;
  new.commentaire := nullif(trim(new.commentaire), '');
  new.updated_at := now();
  return new;
end;
$$;

create or replace function public.avis_voie(p_voie_id uuid)
returns table (
  pseudo text,
  est_moi boolean,
  style text,
  ressenti_cotation text,
  note smallint,
  commentaire text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profil.pseudo,
    enchainement.user_id = (select auth.uid()),
    enchainement.style,
    enchainement.ressenti_cotation,
    enchainement.note,
    enchainement.commentaire
  from public.enchainements enchainement
  join public.profils profil on profil.user_id = enchainement.user_id
  where enchainement.voie_id = p_voie_id
    and (select auth.uid()) is not null
    and (
      profil.partage_activite
      or enchainement.user_id = (select auth.uid())
    )
  order by enchainement.date_enchainement desc, enchainement.id;
$$;

revoke all on function public.avis_voie(uuid) from public, anon;
grant execute on function public.avis_voie(uuid) to authenticated;

comment on column public.profils.partage_activite is
  'Consentement à partager pseudo, style, note, ressenti et commentaire avec les pratiquants authentifiés.';

comment on function public.avis_voie(uuid) is
  'Avis consentis sur une voie, visibles uniquement par les pratiquants authentifiés, sans email ni identifiant utilisateur.';
