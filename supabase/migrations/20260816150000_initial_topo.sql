create extension if not exists pgcrypto;

create table public.relais (
  id uuid primary key default gen_random_uuid(),
  numero smallint not null unique check (numero > 0),
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

create index voies_relais_idx on public.voies(relais_id);
create index voies_couleur_idx on public.voies(couleur_id);
create index voies_cotation_idx on public.voies(cotation_id);

create or replace function public.est_admin()
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

revoke all on function public.est_admin() from public;
grant execute on function public.est_admin() to authenticated;

alter table public.relais enable row level security;
alter table public.couleurs enable row level security;
alter table public.cotations enable row level security;
alter table public.voies enable row level security;
alter table public.administrateurs enable row level security;

create policy "Lecture publique des relais" on public.relais for select using (true);
create policy "Lecture publique des couleurs" on public.couleurs for select using (true);
create policy "Lecture publique des cotations" on public.cotations for select using (true);
create policy "Lecture publique des voies" on public.voies for select using (true);

create policy "Gestion admin des relais" on public.relais for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy "Gestion admin des couleurs" on public.couleurs for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy "Gestion admin des cotations" on public.cotations for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy "Gestion admin des voies" on public.voies for all to authenticated using ((select public.est_admin())) with check ((select public.est_admin()));
create policy "Lecture de son rôle admin" on public.administrateurs for select to authenticated using (user_id = (select auth.uid()));

grant usage on schema public to anon, authenticated;
grant select on public.relais, public.couleurs, public.cotations, public.voies to anon, authenticated;
grant insert, update, delete on public.relais, public.couleurs, public.cotations, public.voies to authenticated;
grant select on public.administrateurs to authenticated;

create or replace function public.actualiser_updated_at()
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
for each row execute function public.actualiser_updated_at();
