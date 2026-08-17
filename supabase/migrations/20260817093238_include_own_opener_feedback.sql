create or replace function public.retours_ouvreurs()
returns table (
  voie_id uuid,
  moyenne_note numeric,
  nombre_notes bigint,
  nombre_recommandations bigint,
  nombre_enchainements bigint,
  nombre_commentaires bigint,
  commentaires text[]
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if (select auth.uid()) is null or not (select private.est_ouvreur_ou_admin()) then
    raise exception 'Accès réservé aux ouvreurs et aux administrateurs.' using errcode = '42501';
  end if;

  return query
  with activites_ouvreurs as (
    select
      enchainement.voie_id,
      enchainement.note,
      enchainement.recommande,
      enchainement.commentaire,
      enchainement.date_enchainement,
      enchainement.id
    from public.enchainements enchainement
  ),
  agregats as (
    select
      activite.voie_id,
      round(avg(activite.note), 2) as moyenne_note,
      count(activite.note)::bigint as nombre_notes,
      count(*) filter (where activite.recommande)::bigint as nombre_recommandations,
      count(*)::bigint as nombre_enchainements,
      count(activite.commentaire)::bigint as nombre_commentaires,
      coalesce(
        array_agg(activite.commentaire order by activite.date_enchainement desc, activite.id)
          filter (where activite.commentaire is not null),
        array[]::text[]
      ) as commentaires
    from activites_ouvreurs activite
    group by activite.voie_id
  )
  select
    voie.id,
    agregat.moyenne_note,
    coalesce(agregat.nombre_notes, 0::bigint),
    coalesce(agregat.nombre_recommandations, 0::bigint),
    coalesce(agregat.nombre_enchainements, 0::bigint),
    coalesce(agregat.nombre_commentaires, 0::bigint),
    coalesce(agregat.commentaires, array[]::text[])
  from public.voies voie
  left join agregats agregat on agregat.voie_id = voie.id;
end;
$$;

comment on function public.retours_ouvreurs() is
  'Retours de tous les enchaînements, indépendamment du partage communautaire, réservés aux ouvreurs et administrateurs.';
