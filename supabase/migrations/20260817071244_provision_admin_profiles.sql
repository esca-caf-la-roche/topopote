create or replace function private.creer_profil_administrateur()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profils (user_id, pseudo, classement_public)
  values (
    new.user_id,
    'Admin-' || left(replace(new.user_id::text, '-', ''), 26),
    false
  )
  on conflict (user_id) do nothing;
  return new;
end;
$$;

revoke all on function private.creer_profil_administrateur() from public, anon, authenticated;

create trigger administrateurs_creer_profil
after insert on public.administrateurs
for each row execute function private.creer_profil_administrateur();

insert into public.profils (user_id, pseudo, classement_public)
select
  administrateur.user_id,
  'Admin-' || left(replace(administrateur.user_id::text, '-', ''), 26),
  false
from public.administrateurs administrateur
on conflict (user_id) do nothing;

comment on function private.creer_profil_administrateur() is
  'Crée automatiquement le profil privé donnant accès au carnet à chaque administrateur.';
