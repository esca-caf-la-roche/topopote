do $$
begin
  if to_regclass('public.couleurs') is not null then
    insert into public.couleurs (nom, hex)
    values
      ('Noir', '#0A0A0A'),
      ('Bleu ciel', '#2874B2'),
      ('Jaune vif', '#FFE500'),
      ('Rouge trafic', '#CC0605'),
      ('Violet signal', '#924E7D'),
      ('Orange fluo', '#FF5A00'),
      ('Rose fluo', '#FF3CF2'),
      ('Vert fluo', '#64FF00'),
      ('Menthe', '#7EBAB5'),
      ('Blanc pur', '#F1F3F2'),
      ('Saumon', '#FA8072')
    on conflict (nom) do update
    set hex = excluded.hex;
  end if;
end;
$$;
