# Objectif et périmètre

## Nom du projet

**topopote** — le topo sans prise de tête.

## Objectif du projet

Mettre à disposition un topo numérique simple du mur d’escalade de Saint-Pierre-en-Faucigny. Toute personne peut consulter les voies et les filtrer par relais, couleur, cotation ou difficulté. Les données sont enregistrées uniquement par les administrateurs autorisés.

## MVP — première version

### Inclus

- consultation publique limitée aux voies de la saison active choisie par un administrateur ;
- filtres publics par zone, numéro de relais, couleur, cotation et difficulté, avec affichage facultatif des demi-voies arrêtées à un relais intermédiaire ;
- renouvellement saisonnier des voies deux fois par an sans perte d’historique ;
- regroupement des relais par zones nommées, par exemple « Zone verticale » ;
- connexion administrateur par code OTP reçu par email, sans mot de passe ni lien magique ;
- ajout et modification des référentiels zones, relais, couleurs et cotations, avec ordre configurable des zones et difficulté modifiable des cotations ;
- regroupement des voies au choix par relais ou cotation, sans ordre manuel ;
- ajout contextuel, modification et suppression des voies de la saison active depuis le topo public en mode édition administrateur ;
- page d’administration dédiée, distincte de la consultation publique ;
- interface responsive au style néo-brutaliste ;
- publication du frontend statique sur GitHub Pages ;
- données, authentification et autorisations dans Supabase.

### Hors périmètre du MVP

- comptes pour le public ;
- carnet de séances et historique personnel ;
- distinction entre voie essayée et voie enchaînée ;
- statistiques et tableaux de bord ;
- photos ou représentation graphique du mur ;
- travail hors ligne.

## Phase 2 — carnet et classement saisonnier

### Inclus

- inscription et connexion pratiquant par code OTP email, sans mot de passe ;
- profil avec pseudo et consentement explicite pour apparaître au classement public ;
- enregistrement d’une voie de la saison active avec date, style, nombre d’essais, note, recommandation, cotation ressentie et commentaire ;
- ajout direct d’un enchaînement depuis chaque voie du topo et repérage des voies déjà enchaînées par une teinte claire correspondant au style ;
- consultation, par les pratiquants connectés, des pseudos, étoiles, ressentis et commentaires dont le partage a été explicitement autorisé ;
- carnet personnel consultable par saison ;
- tableau de bord avec score, rang, volume, meilleure cotation et répartition des styles ;
- classement public par saison fondé sur les dix meilleurs enchaînements ;
- vue administrateur du nombre de profils et de leur volume d’activité.

### Règle de score

Le barème `vertical-life-2026-v1` reprend l’échelle publique actuelle inspirée de 8a.nu : 6a vaut 400 points, 7a 700 et 8a 1 000. Les modificateurs sont +147 à vue, +53 flash, +2 au deuxième essai après travail et −50 en moulinette. Le score d’une saison additionne au maximum les dix meilleures voies uniques. Il s’agit d’un jeu motivant et non d’une mesure absolue du niveau.

Contrairement à 8a.nu, Topopote ne travaille pas sur douze mois glissants : la saison portée par chaque voie constitue la période de classement. Les étoiles, la recommandation, le commentaire et le ressenti de cotation n’ont aucun effet sur les points.

Le partage communautaire est indépendant du classement public. Il est désactivé par défaut et peut être modifié dans les préférences du profil. Même lorsque ce partage est actif, l’adresse email, l’identifiant Auth et le carnet brut ne sont jamais exposés aux autres pratiquants.

### Hors périmètre actuel

- projets ou tentatives non enchaînées ;
- répétitions multiples d’une même voie au sein d’une saison ;
- bonus première ascension, escalade traditionnelle ou compétition ;
- modération avancée, suspension de compte et audit détaillé des corrections ;
- classement national ou inter-salles.
