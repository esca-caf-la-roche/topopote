alter table public.seances_entrainement
  add column duree_minutes smallint check (duree_minutes between 1 and 1440),
  add column effort_percu smallint check (effort_percu between 0 and 10),
  add column type_contrainte text check (char_length(type_contrainte) between 1 and 80),
  add column signaux_contexte text[] not null default '{}',
  add column note_contexte text check (char_length(note_contexte) <= 500);

comment on column public.seances_entrainement.duree_minutes is
  'Durée de pratique de l’échauffement spécifique au dernier effort, repos usuels inclus et longues coupures exclues.';
comment on column public.seances_entrainement.effort_percu is
  'Difficulté globale facultative de toute la séance sur l’échelle session-RPE de 0 à 10.';
comment on column public.seances_entrainement.type_contrainte is
  'Contrainte dominante facultative, distincte de la charge interne.';
comment on column public.seances_entrainement.signaux_contexte is
  'Signaux déclarés pour interpréter la charge sans les intégrer au calcul.';

create table public.activites_charge (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date_activite date not null check (date_activite <= current_date),
  type_activite text not null check (type_activite in ('poutre', 'renforcement', 'course', 'randonnee', 'competition', 'autre')),
  duree_minutes smallint not null check (duree_minutes between 1 and 1440),
  effort_percu smallint not null check (effort_percu between 0 and 10),
  type_contrainte text check (char_length(type_contrainte) between 1 and 80),
  signaux_contexte text[] not null default '{}',
  note_contexte text check (char_length(note_contexte) <= 500),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index activites_charge_user_date_idx
  on public.activites_charge (user_id, date_activite desc, created_at desc);

create or replace function private.preparer_activite_charge()
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
  new.type_contrainte := nullif(trim(new.type_contrainte), '');
  new.note_contexte := nullif(trim(new.note_contexte), '');
  new.updated_at := now();
  return new;
end;
$$;

create trigger activites_charge_preparer
before insert or update on public.activites_charge
for each row execute function private.preparer_activite_charge();

revoke all on function private.preparer_activite_charge() from public, anon, authenticated;

alter table public.activites_charge enable row level security;

create policy "Lecture de ses activités de charge privées"
on public.activites_charge for select to authenticated
using (
  user_id = (select auth.uid())
  and exists (select 1 from public.profils profil where profil.user_id = (select auth.uid()) and profil.acces_entrainement)
);

create policy "Ajout de ses activités de charge privées"
on public.activites_charge for insert to authenticated
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.profils profil where profil.user_id = (select auth.uid()) and profil.acces_entrainement)
);

create policy "Modification de ses activités de charge privées"
on public.activites_charge for update to authenticated
using (
  user_id = (select auth.uid())
  and exists (select 1 from public.profils profil where profil.user_id = (select auth.uid()) and profil.acces_entrainement)
)
with check (
  user_id = (select auth.uid())
  and exists (select 1 from public.profils profil where profil.user_id = (select auth.uid()) and profil.acces_entrainement)
);

create policy "Suppression de ses activités de charge privées"
on public.activites_charge for delete to authenticated
using (
  user_id = (select auth.uid())
  and exists (select 1 from public.profils profil where profil.user_id = (select auth.uid()) and profil.acces_entrainement)
);

revoke all on table public.activites_charge from anon, authenticated;
grant select, insert, update, delete on table public.activites_charge to authenticated;
