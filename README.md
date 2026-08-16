# Topo Saint-Pierre-en-Faucigny

Topo public du mur d’escalade, avec gestion réservée aux administrateurs.

## Démarrer en local

Prérequis : Node.js 22 ou plus récent, npm et Supabase CLI.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Renseigner dans `.env.local` l’URL et la clé publiable du projet Supabase. Ces deux valeurs sont publiques par conception ; ne jamais placer de clé `service_role` dans le frontend.

## Préparer Supabase

Après avoir créé puis lié un projet Supabase :

```powershell
supabase login
supabase link --project-ref VOTRE_REFERENCE
supabase db push
```

Dans **Authentication > Email Templates > Magic Link**, remplacer le contenu par celui de `supabase/templates/magic_link.html`. La présence de `{{ .Token }}` envoie le code OTP ; ne pas conserver `{{ .ConfirmationURL }}`, qui enverrait un lien magique.

Créer ensuite l’utilisateur administrateur depuis le tableau de bord Supabase, puis ajouter son identifiant à la table des administrateurs :

```sql
insert into public.administrateurs (user_id)
select id from auth.users where email = 'admin@example.com';
```

L’application refuse la création automatique de comptes. Un email inconnu ne peut donc pas s’inscrire depuis le site.

## Commandes de vérification

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Déploiement GitHub Pages

Configurer dans les secrets du dépôt :

- `VITE_SUPABASE_URL` ;
- `VITE_SUPABASE_PUBLISHABLE_KEY`.

Puis activer **Settings > Pages > Source: GitHub Actions**. Chaque push sur `main` compile et publie le site.

Le périmètre fonctionnel détaillé se trouve dans `docs/OBJECTIF_ET_PERIMETRE.md` et les choix techniques dans `docs/ARCHITECTURE.md`.
