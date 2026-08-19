alter table public.voies_seance
  add column commentaire text
  check (char_length(commentaire) <= 2000);

comment on column public.voies_seance.commentaire is
  'Note personnelle facultative sur une voie extérieure de la séance.';

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
  new.commentaire := nullif(trim(new.commentaire), '');

  if lieu_seance = 'mur' then
    if new.voie_id is null or new.nom_voie is not null or new.cotation is not null then
      raise exception 'Une séance au mur doit référencer une voie Topopote.' using errcode = '23514';
    end if;
    new.commentaire := null;
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
