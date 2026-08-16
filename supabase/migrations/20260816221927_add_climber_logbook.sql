alter table public.cotations
  add column points smallint;

update public.cotations
set points = case libelle
  when '4' then 50
  when '4+' then 50
  when '5a' then 100
  when '5a+' then 150
  when '5b' then 200
  when '5b+' then 250
  when '5c' then 300
  when '5c+' then 350
  when '6a' then 400
  when '6a+' then 450
  when '6b' then 500
  when '6b+' then 550
  when '6c' then 600
  when '6c+' then 650
  when '7a' then 700
  when '7a+' then 750
  when '7b' then 800
  when '7b+' then 850
  when '7c' then 900
  when '7c+' then 950
  when '8a' then 1000
  when '8a+' then 1050
  when '8b' then 1100
  when '8b+' then 1150
  when '8c' then 1200
  when '8c+' then 1250
  else 50
end;

alter table public.cotations
  alter column points set not null,
  add constraint cotations_points_valides check (points between 0 and 2000);

create or replace function private.points_pour_cotation(p_libelle text)
returns smallint
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  return case trim(p_libelle)
    when '4' then 50 when '4+' then 50
    when '5a' then 100 when '5a+' then 150 when '5b' then 200 when '5b+' then 250 when '5c' then 300 when '5c+' then 350
    when '6a' then 400 when '6a+' then 450 when '6b' then 500 when '6b+' then 550 when '6c' then 600 when '6c+' then 650
    when '7a' then 700 when '7a+' then 750 when '7b' then 800 when '7b+' then 850 when '7c' then 900 when '7c+' then 950
    when '8a' then 1000 when '8a+' then 1050 when '8b' then 1100 when '8b+' then 1150 when '8c' then 1200 when '8c+' then 1250
    when '9a' then 1300 when '9a+' then 1350 when '9b' then 1400 when '9b+' then 1450 when '9c' then 1500
    else null
  end;
end;
$$;

create or replace function private.associer_points_cotation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.points := private.points_pour_cotation(new.libelle);
  if new.points is null then
    raise exception 'La cotation « % » ne possède pas de score Topopote.', new.libelle using errcode = '22023';
  end if;
  return new;
end;
$$;

create trigger cotations_associer_points
before insert or update of libelle on public.cotations
for each row execute function private.associer_points_cotation();

revoke all on function private.points_pour_cotation(text) from public, anon, authenticated;
revoke all on function private.associer_points_cotation() from public, anon, authenticated;

create table public.profils (
  user_id uuid primary key references auth.users(id) on delete cascade,
  pseudo text not null check (char_length(trim(pseudo)) between 2 and 32),
  classement_public boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index profils_pseudo_unique_idx on public.profils (lower(trim(pseudo)));

create table public.enchainements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  voie_id uuid not null references public.voies(id) on delete restrict,
  saison_id uuid not null references public.saisons(id) on delete restrict,
  date_enchainement date not null default current_date check (date_enchainement <= current_date),
  style text not null check (style in ('a_vue', 'flash', 'apres_travail', 'moulinette')),
  essais smallint not null default 1 check (essais between 1 and 999),
  ressenti_cotation text not null default 'conforme'
    check (ressenti_cotation in ('souple', 'conforme', 'dure')),
  note smallint check (note between 1 and 5),
  recommande boolean not null default false,
  commentaire text check (char_length(commentaire) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint enchainements_style_essais_coherents check (
    (style in ('a_vue', 'flash') and essais = 1)
    or style in ('apres_travail', 'moulinette')
  ),
  constraint enchainements_une_voie_par_pratiquant unique (user_id, voie_id)
);

create index enchainements_user_saison_idx
  on public.enchainements (user_id, saison_id, date_enchainement desc);
create index enchainements_saison_score_idx
  on public.enchainements (saison_id, user_id);
create index enchainements_voie_idx on public.enchainements (voie_id);

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
  new.saison_id := saison_de_la_voie;
  new.commentaire := nullif(trim(new.commentaire), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger enchainements_preparer
before insert or update on public.enchainements
for each row execute function private.preparer_enchainement();

create or replace function private.proteger_saison_voie_avec_enchainements()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.saison_id <> old.saison_id and exists (
    select 1 from public.enchainements enchainement where enchainement.voie_id = old.id
  ) then
    raise exception 'La saison d’une voie déjà enregistrée dans un carnet ne peut plus changer.' using errcode = '23514';
  end if;
  return new;
end;
$$;

create trigger voies_proteger_saison_avec_enchainements
before update of saison_id on public.voies
for each row execute function private.proteger_saison_voie_avec_enchainements();

create trigger profils_updated_at
before update on public.profils
for each row execute function private.actualiser_updated_at();

alter table public.profils enable row level security;
alter table public.enchainements enable row level security;

create policy "Lecture de son profil"
on public.profils for select
to authenticated
using (user_id = (select auth.uid()));

create policy "Création de son profil"
on public.profils for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Modification de son profil"
on public.profils for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "Gestion admin des profils"
on public.profils for all
to authenticated
using ((select private.est_admin()))
with check ((select private.est_admin()));

create policy "Lecture de ses enchaînements"
on public.enchainements for select
to authenticated
using (user_id = (select auth.uid()) or (select private.est_admin()));

create policy "Ajout de ses enchaînements"
on public.enchainements for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "Modification de ses enchaînements"
on public.enchainements for update
to authenticated
using (user_id = (select auth.uid()) or (select private.est_admin()))
with check (user_id = (select auth.uid()) or (select private.est_admin()));

create policy "Suppression de ses enchaînements"
on public.enchainements for delete
to authenticated
using (user_id = (select auth.uid()) or (select private.est_admin()));

revoke all on public.profils from anon;
grant select on public.profils to authenticated;
grant insert, update on public.profils to authenticated;
grant select, insert, update, delete on public.enchainements to authenticated;

create or replace function public.classement_saison(p_saison_id uuid default null)
returns table (
  rang bigint,
  pseudo text,
  est_moi boolean,
  score bigint,
  nombre_enchainements bigint,
  meilleur_niveau text,
  a_vue bigint,
  flash bigint,
  apres_travail bigint,
  moulinette bigint
)
language sql
stable
security definer
set search_path = ''
as $$
  with saison_choisie as (
    select coalesce(
      p_saison_id,
      (select saison.id from public.saisons saison where saison.active limit 1)
    ) as id
  ),
  scores_unitaires as (
    select
      enchainement.user_id,
      profil.pseudo,
      cotation.libelle,
      cotation.rang as rang_cotation,
      enchainement.style,
      greatest(0, cotation.points + case enchainement.style
        when 'a_vue' then 147
        when 'flash' then 53
        when 'moulinette' then -50
        when 'apres_travail' then case when enchainement.essais = 2 then 2 else 0 end
        else 0
      end) as points,
      row_number() over (
        partition by enchainement.user_id
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
    from public.enchainements enchainement
    join saison_choisie on saison_choisie.id = enchainement.saison_id
    join public.profils profil on profil.user_id = enchainement.user_id
      and profil.classement_public
    join public.voies voie on voie.id = enchainement.voie_id
    join public.cotations cotation on cotation.id = voie.cotation_id
  ),
  agregats as (
    select
      scores_unitaires.user_id,
      scores_unitaires.pseudo,
      sum(scores_unitaires.points) filter (where position_score <= 10)::bigint as score,
      count(*)::bigint as nombre_enchainements,
      (array_agg(scores_unitaires.libelle order by scores_unitaires.rang_cotation desc))[1] as meilleur_niveau,
      count(*) filter (where style = 'a_vue')::bigint as a_vue,
      count(*) filter (where style = 'flash')::bigint as flash,
      count(*) filter (where style = 'apres_travail')::bigint as apres_travail,
      count(*) filter (where style = 'moulinette')::bigint as moulinette
    from scores_unitaires
    group by scores_unitaires.user_id, scores_unitaires.pseudo
  )
  select
    dense_rank() over (order by agregats.score desc),
    agregats.pseudo,
    agregats.user_id = (select auth.uid()),
    agregats.score,
    agregats.nombre_enchainements,
    agregats.meilleur_niveau,
    agregats.a_vue,
    agregats.flash,
    agregats.apres_travail,
    agregats.moulinette
  from agregats
  order by score desc, nombre_enchainements desc, pseudo asc;
$$;

revoke all on function public.classement_saison(uuid) from public;
grant execute on function public.classement_saison(uuid) to anon, authenticated;

comment on function public.classement_saison(uuid) is
  'Classement ludique par saison : somme des dix meilleurs scores selon le barème Vertical-Life inspiré de 8a.nu.';
