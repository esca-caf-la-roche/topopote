# Architecture technique

## Stack retenue

- React et TypeScript pour l’interface ;
- Vite pour le développement et la compilation statique ;
- Supabase pour PostgreSQL, l’authentification email OTP et les politiques RLS ;
- Vitest pour la logique métier ;
- GitHub Actions et GitHub Pages pour l’hébergement du frontend.

## Modèle de données

`voies` référence trois tables indépendantes : `relais`, `couleurs` et `cotations`. Le champ `rang` des cotations garantit un tri métier fiable : un tri alphabétique ne suffit pas pour comparer `6c+`, `7a` et `7a+`.

Les lectures du topo et des référentiels sont publiques. Toute écriture est protégée côté base par RLS et dépend de la présence de l’utilisateur dans `administrateurs`. Masquer les boutons dans React n’est donc jamais la barrière de sécurité.

## Authentification

Le frontend demande un OTP avec `shouldCreateUser: false`, puis vérifie le code avec `verifyOtp` et le type `email`. Le modèle Supabase doit contenir `{{ .Token }}` et ne doit pas contenir `{{ .ConfirmationURL }}` afin d’envoyer un code au lieu d’un lien magique.
