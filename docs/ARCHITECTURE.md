# Architecture technique

## Stack retenue

- React et TypeScript pour l’interface ;
- Vite pour le développement et la compilation statique ;
- Supabase pour PostgreSQL, l’authentification email OTP et les politiques RLS ;
- Vitest pour la logique métier ;
- GitHub Actions et GitHub Pages pour l’hébergement du frontend.

## Modèle de données

`voies` référence une `saison`, un `relais`, une `couleur` et une `cotation`. Chaque relais référence une `zone`. Une voie qui s’arrête à un relais intermédiaire conserve son relais et porte le booléen `demi_voie`. Les voies n’ont pas d’ordre manuel : elles sont regroupées et triées au choix par numéro de relais ou par rang de cotation. L’ordre des zones reste porté par `zones.ordre`. Le champ `rang` des cotations garantit un tri métier fiable : un tri alphabétique ne suffit pas pour comparer `6c+`, `7a` et `7a+`. Chaque cotation porte aussi une difficulté choisie par l’administrateur parmi « Facile », « Modéré », « Difficile » et « Extrême » ; elle peut servir de filtre public.

Pour l’application, une saison porte uniquement un nom et un état actif : l’administration ne demande ni date de début ni date de fin. Les anciennes colonnes de dates restent facultatives dans PostgreSQL afin que la migration soit réversible, mais le frontend ne les lit plus. Une seule saison peut être active : son activation désactive l’ancienne dans la même transaction grâce à un trigger, tout en conservant les voies historiques. La consultation publique impose cette saison active et ne propose pas de filtre permettant d’afficher les anciennes. Les zones portent également un ordre explicite pour obtenir un affichage stable.

Les lectures du topo et des référentiels sont publiques. Toute écriture est protégée côté base par RLS et dépend de la présence de l’utilisateur dans `administrateurs`. Le contrôle privilégié est isolé dans le schéma non exposé `private`. Un trigger rattache en plus chaque nouvelle voie à la saison active, quelle que soit la valeur envoyée par le client. Les fonctions de gestion de l’ordre des zones et cotations s’exécutent avec les droits de l’appelant et restent réservées aux administrateurs. Masquer les boutons dans React n’est donc jamais la barrière de sécurité.

Les comptes pratiquants utilisent `profils`, relié en un-à-un à `auth.users` sans recopier l’adresse email. `enchainements` relie un pratiquant à une voie et conserve les informations du carnet. Un trigger impose côté base le propriétaire authentifié et la saison réelle de la voie ; une contrainte empêche de compter deux fois la même voie pour un pratiquant. Les politiques RLS limitent le détail du carnet à son propriétaire et aux administrateurs.

Le score de base est porté par `cotations.points` et associé automatiquement au libellé de cotation. La fonction publique `classement_saison` agrège uniquement les profils ayant consenti au classement, somme les dix meilleurs scores et ne retourne ni email ni commentaire. Elle est `security definer` pour exposer volontairement ces seuls agrégats sans ouvrir les carnets bruts ; son `search_path` est vide et tous les objets sont qualifiés.

## Authentification

Le flux administrateur demande un OTP avec `shouldCreateUser: false`. Le flux pratiquant séparé utilise `shouldCreateUser: true`, puis les deux vérifient le code avec `verifyOtp` et le type `email`. Le modèle Supabase doit contenir `{{ .Token }}` et ne doit pas contenir `{{ .ConfirmationURL }}` afin d’envoyer un code au lieu d’un lien magique.

La page d’administration utilise le fragment `#admin`. Ce routage reste compatible avec un hébergement statique GitHub Pages, permet la navigation avant/arrière du navigateur et évite de dépendre d’une réécriture serveur pour `/admin`.
