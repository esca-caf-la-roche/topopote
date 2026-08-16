# Objectif et périmètre

## Objectif du projet

Mettre à disposition un topo numérique simple du mur d’escalade de Saint-Pierre-en-Faucigny. Toute personne peut consulter les voies et les filtrer par relais, couleur ou cotation. Les données sont enregistrées uniquement par les administrateurs autorisés.

## MVP — première version

### Inclus

- consultation publique des voies ;
- filtres par numéro de relais, couleur et cotation ;
- connexion administrateur par code OTP reçu par email, sans mot de passe ni lien magique ;
- gestion des référentiels relais, couleurs et cotations ;
- ajout et suppression de voies par un administrateur ;
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

Une deuxième phase ajoutera les comptes utilisateurs, l’enregistrement daté des séances et des réalisations, puis un tableau de bord. Le schéma actuel conserve des identifiants stables pour les voies afin que ces données puissent être reliées ultérieurement sans refonte du topo.
