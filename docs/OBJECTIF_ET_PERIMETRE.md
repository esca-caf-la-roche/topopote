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

## Suite envisagée

Une deuxième phase ajoutera les comptes utilisateurs, l’enregistrement daté des séances et des réalisations, puis un tableau de bord. Le schéma actuel conserve des identifiants stables pour les voies et leur saison afin que ces données puissent être reliées ultérieurement sans refonte du topo.
