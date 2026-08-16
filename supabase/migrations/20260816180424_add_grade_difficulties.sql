create or replace function private.difficulte_pour_cotation(p_libelle text)
returns text
language plpgsql
immutable
security invoker
set search_path = ''
as $$
begin
  case left(trim(p_libelle), 1)
    when '4', '5' then return 'Facile';
    when '6' then return 'Modéré';
    when '7' then return 'Difficile';
    when '8' then return 'Extrême';
    else
      raise exception 'La cotation « % » doit commencer par 4, 5, 6, 7 ou 8.', p_libelle
        using errcode = '22023';
  end case;
end;
$$;

alter table public.cotations
  add column difficulte text;

update public.cotations
set difficulte = private.difficulte_pour_cotation(libelle);

alter table public.cotations
  alter column difficulte set not null,
  add constraint cotations_difficulte_valide
    check (difficulte in ('Facile', 'Modéré', 'Difficile', 'Extrême'));

create or replace function private.associer_difficulte_cotation()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.difficulte := private.difficulte_pour_cotation(new.libelle);
  return new;
end;
$$;

create trigger cotations_associer_difficulte
before insert or update of libelle on public.cotations
for each row
execute function private.associer_difficulte_cotation();
