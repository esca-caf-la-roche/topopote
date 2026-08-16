do $$
begin
  if to_regclass('public.saisons') is not null then
    alter table public.saisons alter column date_debut drop not null;
  end if;
end;
$$;
