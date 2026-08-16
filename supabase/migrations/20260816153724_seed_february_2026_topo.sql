insert into public.zones (nom, ordre)
values
  ('Tour', 1),
  ('Dalle', 2),
  ('Pan Centrale', 3),
  ('Grotte (Plafond)', 4),
  ('Devers de droite', 5)
on conflict (nom) do update
set ordre = excluded.ordre;

insert into public.saisons (nom, active)
values ('Février 2026', false)
on conflict (nom) do nothing;

with relais_source (numero, zone_nom) as (
  values
    (2, 'Dalle'), (3, 'Dalle'), (4, 'Dalle'), (5, 'Dalle'), (6, 'Dalle'),
    (7, 'Dalle'), (8, 'Dalle'), (9, 'Dalle'), (10, 'Dalle'), (11, 'Dalle'),
    (12, 'Pan Centrale'), (13, 'Pan Centrale'), (14, 'Pan Centrale'),
    (15, 'Pan Centrale'), (16, 'Pan Centrale'), (17, 'Pan Centrale'),
    (18, 'Pan Centrale'), (19, 'Pan Centrale'), (20, 'Pan Centrale'),
    (21, 'Grotte (Plafond)'), (22, 'Grotte (Plafond)'),
    (23, 'Grotte (Plafond)'), (24, 'Grotte (Plafond)'),
    (25, 'Devers de droite'), (26, 'Devers de droite'),
    (27, 'Devers de droite'), (28, 'Devers de droite'), (29, 'Devers de droite'),
    (30, 'Tour'), (31, 'Tour'), (32, 'Tour'), (33, 'Tour'),
    (34, 'Tour'), (35, 'Tour'), (36, 'Tour')
)
insert into public.relais (numero, zone_id)
select source.numero, zone.id
from relais_source source
join public.zones zone on zone.nom = source.zone_nom
on conflict (numero) do update
set zone_id = excluded.zone_id;

insert into public.couleurs (nom, hex)
values
  ('Noir', '#000000'),
  ('Bleu ciel', '#4A86E8'),
  ('Bleu roi', '#0000FF'),
  ('Jaune vif', '#FFFF00'),
  ('Rouge trafic', '#FF0000'),
  ('Violet signal', '#9900FF'),
  ('Orange fluo', '#FF9900'),
  ('Rose fluo', '#FF00FF'),
  ('Vert fluo', '#00FF00'),
  ('Blanc pur', '#FFFFFF'),
  ('Saumon', '#E6B8AF'),
  ('Gris clair', '#CCCCCC'),
  ('Pêche', '#FCE5CD')
on conflict (nom) do update
set hex = excluded.hex;

insert into public.cotations (libelle, rang)
values
  ('4', 1), ('4+', 2), ('5a', 3), ('5b', 4), ('5c', 5),
  ('6a', 6), ('6a+', 7), ('6b', 8), ('6b+', 9), ('6c', 10), ('6c+', 11),
  ('7a', 12), ('7a+', 13), ('7b', 14), ('7b+', 15), ('7c', 16), ('7c+', 17),
  ('8a', 18), ('8a+', 19), ('8b', 20), ('8b+', 21), ('8c', 22), ('8c+', 23)
on conflict (libelle) do update
set rang = excluded.rang;

with voies_source (ligne_source, numero_relais, cotation, couleur, demi_voie) as (
  values
    ('30', 30, '4', 'Bleu ciel', false),
    ('30', 30, '5b', 'Rouge trafic', false),
    ('30', 30, '6b', 'Noir', false),
    ('31', 31, '4', 'Vert fluo', false),
    ('31', 31, '5a', 'Violet signal', false),
    ('31', 31, '5c', 'Noir', false),
    ('32', 32, '4', 'Bleu ciel', false),
    ('32', 32, '5b', 'Jaune vif', false),
    ('33', 33, '4', 'Vert fluo', false),
    ('33', 33, '5b', 'Noir', false),
    ('33', 33, '6a', 'Rose fluo', false),
    ('35', 35, '4', 'Violet signal', false),
    ('35', 35, '5b', 'Bleu ciel', false),
    ('36', 36, '4', 'Rouge trafic', false),
    ('36', 36, '4+', 'Orange fluo', false),
    ('36', 36, '5a', 'Vert fluo', false),
    ('2', 2, '4', 'Jaune vif', false),
    ('2', 2, '5a', 'Blanc pur', false),
    ('2', 2, '6a+', 'Violet signal', false),
    ('3', 3, '4', 'Vert fluo', false),
    ('3', 3, '5b', 'Bleu roi', false),
    ('3', 3, '6b', 'Orange fluo', false),
    ('4', 4, '4+', 'Noir', false),
    ('4', 4, '6a', 'Blanc pur', false),
    ('4', 4, '6c+', 'Rose fluo', false),
    ('5', 5, '4', 'Vert fluo', false),
    ('5', 5, '6b+', 'Bleu ciel', false),
    ('5', 5, '7b', 'Rouge trafic', false),
    ('6', 6, '4+', 'Vert fluo', false),
    ('6', 6, '5b', 'Jaune vif', false),
    ('6', 6, '6a', 'Orange fluo', false),
    ('6', 6, '7a', 'Violet signal', false),
    ('7', 7, '5c', 'Bleu ciel', false),
    ('7', 7, '6a+', 'Rose fluo', false),
    ('7', 7, '6b+', 'Blanc pur', false),
    ('8', 8, '7a+', 'Rouge trafic', false),
    ('9', 9, '5c', 'Rose fluo', false),
    ('9', 9, '6b+', 'Noir', false),
    ('10', 10, '6c', 'Jaune vif', false),
    ('10', 10, '7c', 'Orange fluo', false),
    ('13', 13, '6b', 'Rouge trafic', false),
    ('13', 13, '6c+', 'Noir', false),
    ('13', 13, '7a+', 'Jaune vif', false),
    ('14', 14, '7a', 'Rose fluo', false),
    ('14', 14, '7c+', 'Vert fluo', false),
    ('14', 14, '8b+', 'Bleu roi', false),
    ('15', 15, '6a', 'Blanc pur', false),
    ('15', 15, '7b+', 'Orange fluo', false),
    ('16', 16, '6b+', 'Rouge trafic', false),
    ('16', 16, '7a', 'Noir', false),
    ('16', 16, '7c', 'Vert fluo', false),
    ('16', 16, '8a', 'Jaune vif', false),
    ('17', 17, '7a+', 'Blanc pur', false),
    ('17', 17, '7b', 'Bleu ciel', false),
    ('18', 18, '6a', 'Rose fluo', false),
    ('18', 18, '6c+', 'Violet signal', false),
    ('18', 18, '7b+', 'Jaune vif', false),
    ('19', 19, '6b', 'Orange fluo', false),
    ('19', 19, '6c', 'Vert fluo', false),
    ('19', 19, '7b', 'Bleu ciel', false),
    ('20 pilier', 20, '6a+', 'Noir', false),
    ('20 pilier', 20, '7a+', 'Rose fluo', false),
    ('20 flanc', 20, '6c', 'Violet signal', false),
    ('20 flanc', 20, '8a', 'Vert fluo', false),
    ('21 gauche', 21, '7a', 'Bleu roi', false),
    ('21 gauche', 21, '8a+', 'Orange fluo', false),
    ('21 gauche', 21, '8c', 'Noir', false),
    ('21 directe', 21, '6c', 'Jaune vif', false),
    ('sous 21 A', 21, '4', 'Violet signal', true),
    ('sous 21 A', 21, '5b', 'Jaune vif', true),
    ('sous 21 B', 21, '4+', 'Noir', true),
    ('sous 21 B', 21, '5b', 'Saumon', true),
    ('sous 22 A', 22, '4+', 'Rouge trafic', true),
    ('sous 22 A', 22, '5b', 'Vert fluo', true),
    ('sous 22 B', 22, '5a', 'Orange fluo', true),
    ('22', 22, '7a+', 'Rouge trafic', false),
    ('22', 22, '7b', 'Violet signal', false),
    ('23', 23, '6b', 'Vert fluo', false),
    ('23', 23, '7b+', 'Blanc pur', false),
    ('24', 24, '6b+', 'Rose fluo', false),
    ('24', 24, '7c', 'Bleu roi', false),
    ('sous 25', 25, '5a', 'Blanc pur', true),
    ('25', 25, '6b', 'Noir', false),
    ('25', 25, '7a+', 'Jaune vif', false),
    ('25', 25, '8a+', 'Violet signal', false),
    ('26', 26, '7b+', 'Blanc pur', false),
    ('26', 26, '7c+', 'Rose fluo', false),
    ('26', 26, '8b', 'Rouge trafic', false),
    ('sous 27', 27, '4', 'Gris clair', true),
    ('27', 27, '6b+', 'Vert fluo', false),
    ('27', 27, '7a', 'Noir', false),
    ('27', 27, '7c', 'Jaune vif', false),
    ('sous 28', 28, '4+', 'Pêche', true),
    ('28', 28, '6a', 'Bleu ciel', false),
    ('28', 28, '6c', 'Violet signal', false),
    ('28', 28, '7b', 'Orange fluo', false),
    ('sous 29', 29, '4+', 'Blanc pur', true),
    ('29', 29, '5c', 'Rouge trafic', false),
    ('29', 29, '6c+', 'Jaune vif', false)
)
insert into public.voies (saison_id, relais_id, couleur_id, cotation_id, demi_voie)
select saison.id, relais.id, couleur.id, cotation.id, source.demi_voie
from voies_source source
join public.saisons saison on saison.nom = 'Février 2026'
join public.relais relais on relais.numero = source.numero_relais
join public.couleurs couleur on couleur.nom = source.couleur
join public.cotations cotation on cotation.libelle = source.cotation
where not exists (
  select 1
  from public.voies voie
  where voie.saison_id = saison.id
    and voie.relais_id = relais.id
    and voie.couleur_id = couleur.id
    and voie.cotation_id = cotation.id
    and voie.demi_voie = source.demi_voie
);

do $$
declare
  nombre_voies integer;
  nombre_demi_voies integer;
begin
  select count(*), count(*) filter (where voie.demi_voie)
  into nombre_voies, nombre_demi_voies
  from public.voies voie
  join public.saisons saison on saison.id = voie.saison_id
  where saison.nom = 'Février 2026';

  if nombre_voies <> 99 or nombre_demi_voies <> 11 then
    raise exception 'Topo Février 2026 incomplet : % voies, dont % demi-voies',
      nombre_voies, nombre_demi_voies;
  end if;
end;
$$;
