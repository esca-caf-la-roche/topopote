create extension if not exists pgcrypto;

create schema if not exists private;
revoke all on schema private from public;

create table public.zones (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique check (length(trim(nom)) > 0),
  ordre smallint not null unique check (ordre > 0),
  created_at timestamptz not null default now()
);

create table public.saisons (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique check (length(trim(nom)) > 0),
  date_debut date,
  date_fin date,
  active boolean not null default false,
  created_at timestamptz not null default now(),
  constraint saisons_dates_valides check (date_fin is null or date_fin >= date_debut)
);

create unique index saisons_une_active_idx on public.saisons(active) where active;

create table public.relais (
  id uuid primary key default gen_random_uuid(),
  numero smallint not null unique check (numero > 0),
  zone_id uuid not null references public.zones(id) on delete restrict,
  created_at timestamptz not null default now()
);

create table public.couleurs (
  id uuid primary key default gen_random_uuid(),
  nom text not null unique check (length(trim(nom)) > 0),
  hex text not null check (hex ~ '^#[0-9A-Fa-f]{6}$'),
  created_at timestamptz not null default now()
);

create table public.cotations (
  id uuid primary key default gen_random_uuid(),
  libelle text not null unique check (length(trim(libelle)) > 0),
  rang smallint not null unique check (rang > 0),
  created_at timestamptz not null default now()
);

create table public.voies (
  id uuid primary key default gen_random_uuid(),
  saison_id uuid not null references public.saisons(id) on delete restrict,
  relais_id uuid not null references public.relais(id) on delete restrict,
  couleur_id uuid not null references public.couleurs(id) on delete restrict,
  cotation_id uuid not null references public.cotations(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.administrateurs (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index relais_zone_idx on public.relais(zone_id);
create index voies_saison_idx on public.voies(saison_id);
create index voies_relais_idx on public.voies(relais_id);
create index voies_couleur_idx on public.voies(couleur_id);
create index voies_cotation_idx on public.voies(cotation_id);

create or replace function private.est_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.administrateurs
    where user_id = auth.uid()
  );
$$;

revoke all on function private.est_admin() from public, anon, authenticated;

create or replace function private.garder_une_saison_active()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.active then
    update public.saisons set active = false where active and id <> new.id;
  end if;
  return new;
end;
$$;

create trigger saisons_une_active
before insert or update of active on public.saisons
for each row when (new.active)
execute function private.garder_une_saison_active();

alter table public.zones enable row level security;
alter table public.saisons enable row level security;
alter table public.relais enable row level security;
alter table public.couleurs enable row level security;
alter table public.cotations enable row level security;
alter table public.voies enable row level security;
alter table public.administrateurs enable row level security;

create policy "Lecture publique des zones" on public.zones for select using (true);
create policy "Lecture publique des saisons" on public.saisons for select using (true);
create policy "Lecture publique des relais" on public.relais for select using (true);
create policy "Lecture publique des couleurs" on public.couleurs for select using (true);
create policy "Lecture publique des cotations" on public.cotations for select using (true);
create policy "Lecture publique des voies" on public.voies for select using (true);

create policy "Gestion admin des zones" on public.zones for all to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Gestion admin des saisons" on public.saisons for all to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Gestion admin des relais" on public.relais for all to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Gestion admin des couleurs" on public.couleurs for all to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Gestion admin des cotations" on public.cotations for all to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Gestion admin des voies" on public.voies for all to authenticated using ((select private.est_admin())) with check ((select private.est_admin()));
create policy "Lecture de son rôle admin" on public.administrateurs for select to authenticated using (user_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.zones, public.saisons, public.relais, public.couleurs, public.cotations, public.voies to anon, authenticated;
grant insert, update, delete on public.zones, public.saisons, public.relais, public.couleurs, public.cotations, public.voies to authenticated;
grant select on public.administrateurs to authenticated;

create or replace function private.actualiser_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger voies_updated_at
before update on public.voies
for each row execute function private.actualiser_updated_at();
