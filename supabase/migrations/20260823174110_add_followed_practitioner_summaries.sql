create or replace function public.mes_pratiquants_suivis()
returns table (
  profil_id uuid,
  pseudo text,
  me_suit boolean,
  score bigint,
  saison text
)
language sql
stable
security definer
set search_path = ''
as $$
  with cibles as (
    select
      profil.user_id,
      profil.id_public,
      profil.pseudo,
      exists (
        select 1
        from public.suivis_pratiquants suivi_reciproque
        where suivi_reciproque.suiveur_id = profil.user_id
          and suivi_reciproque.suivi_id = (select auth.uid())
      ) as me_suit
    from public.suivis_pratiquants suivi
    join public.profils profil
      on profil.user_id = suivi.suivi_id
      and profil.partage_activite
    where suivi.suiveur_id = (select auth.uid())
      and (select auth.uid()) is not null
      and exists (
        select 1
        from public.profils profil_courant
        where profil_courant.user_id = (select auth.uid())
          and profil_courant.partage_activite
      )
  ),
  scores_unitaires as (
    select
      cible.user_id,
      greatest(0, cotation.points + case enchainement.style
        when 'a_vue' then 147
        when 'flash' then 53
        when 'moulinette' then -50
        when 'apres_travail' then case when enchainement.essais = 2 then 2 else 0 end
        else 0
      end) as points,
      row_number() over (
        partition by cible.user_id
        order by
          cotation.points + case enchainement.style
            when 'a_vue' then 147
            when 'flash' then 53
            when 'moulinette' then -50
            when 'apres_travail' then case when enchainement.essais = 2 then 2 else 0 end
            else 0
          end desc,
          enchainement.date_enchainement asc,
          enchainement.id
      ) as position_score
    from cibles cible
    join public.enchainements enchainement on enchainement.user_id = cible.user_id
    join public.saisons saison
      on saison.id = enchainement.saison_id
      and saison.active
    join public.voies voie on voie.id = enchainement.voie_id
    join public.cotations cotation on cotation.id = voie.cotation_id
  ),
  scores as (
    select
      score_unitaire.user_id,
      coalesce(sum(score_unitaire.points) filter (where score_unitaire.position_score <= 10), 0)::bigint as score
    from scores_unitaires score_unitaire
    group by score_unitaire.user_id
  )
  select
    cible.id_public,
    cible.pseudo,
    cible.me_suit,
    coalesce(score.score, 0)::bigint,
    (select saison_active.nom from public.saisons saison_active where saison_active.active limit 1)
  from cibles cible
  left join scores score on score.user_id = cible.user_id
  order by lower(cible.pseudo), cible.pseudo;
$$;

create or replace function public.realisations_pratiquant_suivi(p_profil_id uuid)
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
    and profil.id_public = p_profil_id
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
    and exists (
      select 1
      from public.profils profil_courant
      where profil_courant.user_id = (select auth.uid())
        and profil_courant.partage_activite
    )
  order by enchainement.date_enchainement desc, enchainement.created_at desc, enchainement.id;
$$;

revoke all on function public.mes_pratiquants_suivis() from public, anon;
revoke all on function public.realisations_pratiquant_suivi(uuid) from public, anon;

grant execute on function public.mes_pratiquants_suivis() to authenticated;
grant execute on function public.realisations_pratiquant_suivi(uuid) to authenticated;

comment on function public.mes_pratiquants_suivis() is
  'Liste les profils suivis qui partagent encore leur activité et leur score des dix meilleures voies de la saison active.';

comment on function public.realisations_pratiquant_suivi(uuid) is
  'Expose les réalisations partagées d’un profil identifié par son ID social uniquement à un pratiquant qui le suit et partage aussi son activité.';
