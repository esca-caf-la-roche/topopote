create table public.ouvreurs (
  user_id uuid primary key references public.profils(user_id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.ouvreurs enable row level security;

revoke all on public.ouvreurs from anon;

create policy "Lecture de son rôle ouvreur"
on public.ouvreurs for select
to authenticated
using (user_id = (select auth.uid()) or (select private.est_admin()));

create policy "Gestion admin des ouvreurs"
on public.ouvreurs for all
to authenticated
using ((select private.est_admin()))
with check ((select private.est_admin()));

grant select, insert, delete on public.ouvreurs to authenticated;

create or replace function private.est_ouvreur_ou_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select
    (select private.est_admin())
    or exists (
      select 1
      from public.ouvreurs ouvreur
      where ouvreur.user_id = (select auth.uid())
    );
$$;

revoke all on function private.est_ouvreur_ou_admin() from public, anon, authenticated;

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
  with activites_partagees as (
    select
      enchainement.voie_id,
      enchainement.note,
      enchainement.recommande,
      enchainement.commentaire,
      enchainement.date_enchainement,
      enchainement.id
    from public.enchainements enchainement
    join public.profils profil on profil.user_id = enchainement.user_id
    where profil.partage_activite
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
    from activites_partagees activite
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

revoke all on function public.retours_ouvreurs() from public, anon;
grant execute on function public.retours_ouvreurs() to authenticated;

comment on table public.ouvreurs is
  'Pratiquants promus par un administrateur et autorisés à consulter les retours agrégés des voies.';

comment on function public.retours_ouvreurs() is
  'Retours de toutes les voies, limités aux activités dont le partage a été accepté et réservés aux ouvreurs et administrateurs.';
