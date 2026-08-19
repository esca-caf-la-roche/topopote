alter table public.profils
  add column acces_entrainement boolean not null default false;

comment on column public.profils.acces_entrainement is
  'Accès privé au carnet de séances, activé manuellement côté Supabase et non modifiable par le client.';

create or replace function private.proteger_acces_entrainement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is not null then
    if tg_op = 'INSERT' then
      new.acces_entrainement := false;
    elsif new.acces_entrainement is distinct from old.acces_entrainement then
      raise exception 'L’accès au carnet d’entraînement est géré côté Supabase.' using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger profils_proteger_acces_entrainement
before insert or update of acces_entrainement on public.profils
for each row execute function private.proteger_acces_entrainement();

revoke all on function private.proteger_acces_entrainement() from public, anon, authenticated;

create table public.seances_entrainement (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_seance date not null default current_date check (date_seance <= current_date),
  type_lieu text not null check (type_lieu in ('mur', 'exterieur')),
  falaise text check (char_length(falaise) <= 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint seances_entrainement_lieu_coherent check (
    (type_lieu = 'mur' and falaise is null)
    or (type_lieu = 'exterieur' and char_length(trim(falaise)) between 1 and 120)
  )
);

create table public.voies_seance (
  id uuid primary key default gen_random_uuid(),
  seance_id uuid not null references public.seances_entrainement(id) on delete cascade,
  voie_id uuid references public.voies(id) on delete restrict,
  nom_voie text check (char_length(nom_voie) <= 120),
  cotation text check (char_length(cotation) <= 20),
  nombre_essais smallint not null default 1 check (nombre_essais between 1 and 999),
  enchainee boolean not null default false,
  style text check (style in ('a_vue', 'flash', 'apres_travail', 'moulinette')),
  enchainement_id uuid unique references public.enchainements(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint voies_seance_enchainement_coherent check (
    (enchainee and style is not null)
    or (not enchainee and style is null and enchainement_id is null)
  )
);

create index seances_entrainement_user_date_idx
  on public.seances_entrainement (user_id, date_seance desc, created_at desc);
create index voies_seance_seance_idx on public.voies_seance (seance_id, created_at);
create unique index voies_seance_une_voie_mur_par_seance_idx
  on public.voies_seance (seance_id, voie_id)
  where voie_id is not null;
create index voies_seance_voie_idx
  on public.voies_seance (voie_id, created_at)
  where voie_id is not null;

create or replace function private.preparer_seance_entrainement()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    new.user_id := (select auth.uid());
  else
    new.user_id := old.user_id;
  end if;
  new.falaise := nullif(trim(new.falaise), '');
  if new.type_lieu = 'mur' then
    new.falaise := null;
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger seances_entrainement_preparer
before insert or update on public.seances_entrainement
for each row execute function private.preparer_seance_entrainement();

create or replace function private.preparer_voie_seance()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  proprietaire_seance uuid;
  lieu_seance text;
  proprietaire_enchainement uuid;
  voie_enchainement uuid;
begin
  select seance.user_id, seance.type_lieu
  into proprietaire_seance, lieu_seance
  from public.seances_entrainement seance
  where seance.id = new.seance_id;

  if proprietaire_seance is null then
    raise exception 'Séance introuvable.' using errcode = '23503';
  end if;

  new.nom_voie := nullif(trim(new.nom_voie), '');
  new.cotation := nullif(trim(new.cotation), '');

  if lieu_seance = 'mur' then
    if new.voie_id is null or new.nom_voie is not null or new.cotation is not null then
      raise exception 'Une séance au mur doit référencer une voie Topopote.' using errcode = '23514';
    end if;
  elsif new.voie_id is not null or new.nom_voie is null or new.cotation is null then
    raise exception 'Une voie extérieure doit avoir un nom et une cotation.' using errcode = '23514';
  end if;

  if new.enchainement_id is not null then
    if lieu_seance <> 'mur' then
      raise exception 'Une voie extérieure ne peut pas référencer un enchaînement Topopote.' using errcode = '23514';
    end if;
    select enchainement.user_id, enchainement.voie_id
    into proprietaire_enchainement, voie_enchainement
    from public.enchainements enchainement
    where enchainement.id = new.enchainement_id;
    if proprietaire_enchainement is distinct from proprietaire_seance
      or voie_enchainement is distinct from new.voie_id then
      raise exception 'L’enchaînement ne correspond pas à cette séance.' using errcode = '23514';
    end if;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

create trigger voies_seance_preparer
before insert or update on public.voies_seance
for each row execute function private.preparer_voie_seance();

revoke all on function private.preparer_seance_entrainement() from public, anon, authenticated;
revoke all on function private.preparer_voie_seance() from public, anon, authenticated;

alter table public.seances_entrainement enable row level security;
alter table public.voies_seance enable row level security;

create policy "Lecture de ses séances privées"
on public.seances_entrainement for select
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profils profil
    where profil.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
);

create policy "Ajout de ses séances privées"
on public.seances_entrainement for insert
to authenticated
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profils profil
    where profil.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
);

create policy "Modification de ses séances privées"
on public.seances_entrainement for update
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profils profil
    where profil.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
)
with check (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profils profil
    where profil.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
);

create policy "Suppression de ses séances privées"
on public.seances_entrainement for delete
to authenticated
using (
  user_id = (select auth.uid())
  and exists (
    select 1 from public.profils profil
    where profil.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
);

create policy "Lecture des voies de ses séances privées"
on public.voies_seance for select
to authenticated
using (
  exists (
    select 1
    from public.seances_entrainement seance
    join public.profils profil on profil.user_id = seance.user_id
    where seance.id = voies_seance.seance_id
      and seance.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
);

create policy "Ajout des voies de ses séances privées"
on public.voies_seance for insert
to authenticated
with check (
  exists (
    select 1
    from public.seances_entrainement seance
    join public.profils profil on profil.user_id = seance.user_id
    where seance.id = voies_seance.seance_id
      and seance.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
);

create policy "Modification des voies de ses séances privées"
on public.voies_seance for update
to authenticated
using (
  exists (
    select 1
    from public.seances_entrainement seance
    join public.profils profil on profil.user_id = seance.user_id
    where seance.id = voies_seance.seance_id
      and seance.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
)
with check (
  exists (
    select 1
    from public.seances_entrainement seance
    join public.profils profil on profil.user_id = seance.user_id
    where seance.id = voies_seance.seance_id
      and seance.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
);

create policy "Suppression des voies de ses séances privées"
on public.voies_seance for delete
to authenticated
using (
  exists (
    select 1
    from public.seances_entrainement seance
    join public.profils profil on profil.user_id = seance.user_id
    where seance.id = voies_seance.seance_id
      and seance.user_id = (select auth.uid())
      and profil.acces_entrainement
  )
);

revoke all on table public.seances_entrainement from anon, authenticated;
revoke all on table public.voies_seance from anon, authenticated;
grant select, insert, update, delete on table public.seances_entrainement to authenticated;
grant select, insert, update, delete on table public.voies_seance to authenticated;
