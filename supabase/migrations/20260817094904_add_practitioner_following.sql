alter table public.profils
  add column id_public uuid not null default gen_random_uuid();

create unique index profils_id_public_unique_idx on public.profils (id_public);

create or replace function private.proteger_id_public_profil()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.id_public <> old.id_public then
    raise exception 'L’identifiant social d’un profil ne peut pas être modifié.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger profils_proteger_id_public
before update of id_public on public.profils
for each row execute function private.proteger_id_public_profil();

revoke all on function private.proteger_id_public_profil() from public, anon, authenticated;

create table public.suivis_pratiquants (
  suiveur_id uuid not null references public.profils(user_id) on delete cascade,
  suivi_id uuid not null references public.profils(user_id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (suiveur_id, suivi_id),
  constraint suivis_pratiquants_pas_soi_meme check (suiveur_id <> suivi_id)
);

create index suivis_pratiquants_suivi_idx
  on public.suivis_pratiquants (suivi_id, created_at desc);

alter table public.suivis_pratiquants enable row level security;

create policy "Lecture de ses relations pratiquants"
on public.suivis_pratiquants for select
to authenticated
using (
  suiveur_id = (select auth.uid())
  or suivi_id = (select auth.uid())
);

create policy "Ajout de ses suivis pratiquants"
on public.suivis_pratiquants for insert
to authenticated
with check (suiveur_id = (select auth.uid()));

create policy "Suppression de ses suivis pratiquants"
on public.suivis_pratiquants for delete
to authenticated
using (suiveur_id = (select auth.uid()));

revoke all on public.suivis_pratiquants from anon, authenticated;

create or replace function public.annuaire_pratiquants()
returns table (
  profil_id uuid,
  pseudo text,
  est_suivi boolean,
  me_suit boolean,
  peut_suivre boolean
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profil.id_public,
    profil.pseudo,
    exists (
      select 1
      from public.suivis_pratiquants suivi
      where suivi.suiveur_id = (select auth.uid())
        and suivi.suivi_id = profil.user_id
    ),
    exists (
      select 1
      from public.suivis_pratiquants suivi
      where suivi.suiveur_id = profil.user_id
        and suivi.suivi_id = (select auth.uid())
    ),
    profil.partage_activite
  from public.profils profil
  where (select auth.uid()) is not null
    and profil.user_id <> (select auth.uid())
    and not (
      profil.pseudo = 'Admin-' || left(replace(profil.user_id::text, '-', ''), 26)
      and exists (
        select 1
        from public.administrateurs administrateur
        where administrateur.user_id = profil.user_id
      )
    )
    and (
      profil.partage_activite
      or exists (
        select 1
        from public.suivis_pratiquants relation
        where (
          relation.suiveur_id = (select auth.uid())
          and relation.suivi_id = profil.user_id
        ) or (
          relation.suiveur_id = profil.user_id
          and relation.suivi_id = (select auth.uid())
        )
      )
    )
    and exists (
      select 1
      from public.profils profil_courant
      where profil_courant.user_id = (select auth.uid())
    )
  order by lower(profil.pseudo), profil.pseudo;
$$;

create or replace function public.suivre_pratiquant(p_profil_id uuid, p_suivre boolean)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  utilisateur_courant uuid := (select auth.uid());
  utilisateur_suivi uuid;
begin
  if utilisateur_courant is null then
    raise exception 'Authentification requise.' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.profils profil
    where profil.user_id = utilisateur_courant
  ) then
    raise exception 'Crée ton profil pratiquant avant de suivre quelqu’un.' using errcode = '23503';
  end if;

  select profil.user_id into utilisateur_suivi
  from public.profils profil
  where profil.id_public = p_profil_id
    and not (
      profil.pseudo = 'Admin-' || left(replace(profil.user_id::text, '-', ''), 26)
      and exists (
        select 1
        from public.administrateurs administrateur
        where administrateur.user_id = profil.user_id
      )
    );

  if utilisateur_suivi is null then
    raise exception 'Pratiquant introuvable.' using errcode = '22023';
  end if;

  if utilisateur_suivi = utilisateur_courant then
    raise exception 'Tu ne peux pas te suivre toi-même.' using errcode = '22023';
  end if;

  if p_suivre is null then
    raise exception 'Indique si le pratiquant doit être suivi ou non.' using errcode = '22023';
  elsif p_suivre then
    if not exists (
      select 1
      from public.profils profil
      where profil.user_id = utilisateur_suivi
        and profil.partage_activite
    ) then
      raise exception 'Ce pratiquant n’accepte pas de nouveau suivi.' using errcode = '22023';
    end if;

    insert into public.suivis_pratiquants (suiveur_id, suivi_id)
    values (utilisateur_courant, utilisateur_suivi)
    on conflict do nothing;
  else
    delete from public.suivis_pratiquants
    where suiveur_id = utilisateur_courant
      and suivi_id = utilisateur_suivi;
  end if;
end;
$$;

create or replace function public.fil_activite_pratiquants(p_limite integer default 50)
returns table (
  pseudo text,
  date_enchainement date,
  style text,
  ressenti_cotation text,
  note smallint,
  recommande boolean,
  commentaire text,
  saison text,
  zone text,
  relais smallint,
  couleur text,
  couleur_hex text,
  cotation text
)
language sql
stable
security definer
set search_path = ''
as $$
  select
    profil.pseudo,
    enchainement.date_enchainement,
    enchainement.style,
    enchainement.ressenti_cotation,
    enchainement.note,
    enchainement.recommande,
    enchainement.commentaire,
    saison.nom,
    zone.nom,
    relais.numero,
    couleur.nom,
    couleur.hex,
    cotation.libelle
  from public.suivis_pratiquants suivi
  join public.profils profil
    on profil.user_id = suivi.suivi_id
    and profil.partage_activite
  join public.enchainements enchainement on enchainement.user_id = suivi.suivi_id
  join public.voies voie on voie.id = enchainement.voie_id
  join public.saisons saison on saison.id = enchainement.saison_id
  join public.relais relais on relais.id = voie.relais_id
  join public.zones zone on zone.id = relais.zone_id
  join public.couleurs couleur on couleur.id = voie.couleur_id
  join public.cotations cotation on cotation.id = voie.cotation_id
  where suivi.suiveur_id = (select auth.uid())
    and (select auth.uid()) is not null
  order by enchainement.date_enchainement desc, enchainement.created_at desc, enchainement.id
  limit least(greatest(coalesce(p_limite, 50), 1), 100);
$$;

revoke all on function public.annuaire_pratiquants() from public, anon;
revoke all on function public.suivre_pratiquant(uuid, boolean) from public, anon;
revoke all on function public.fil_activite_pratiquants(integer) from public, anon;

grant execute on function public.annuaire_pratiquants() to authenticated;
grant execute on function public.suivre_pratiquant(uuid, boolean) to authenticated;
grant execute on function public.fil_activite_pratiquants(integer) to authenticated;

comment on table public.suivis_pratiquants is
  'Relations unidirectionnelles entre profils pratiquants. Les identifiants restent internes et les accès passent par des RPC étroits.';

comment on function public.annuaire_pratiquants() is
  'Annuaire authentifié des pseudos avec un identifiant social aléatoire et les deux sens de la relation, sans email ni identifiant Auth.';

comment on function public.suivre_pratiquant(uuid, boolean) is
  'Ajoute ou retire un suivi par identifiant social public pour le profil authentifié.';

comment on function public.fil_activite_pratiquants(integer) is
  'Fil chronologique des enchaînements partagés par les profils suivis, limité à 100 entrées.';
