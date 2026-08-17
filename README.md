# topopote

Le topo sans prise de tête du mur d’escalade de Saint-Pierre-en-Faucigny, avec gestion réservée aux administrateurs.

## Démarrer en local

Prérequis : Node.js 22 ou plus récent, npm et Supabase CLI.

```powershell
npm.cmd install
Copy-Item .env.example .env.local
npm.cmd run dev
```

Renseigner dans `.env.local` l’URL et la clé publiable du projet Supabase `Topopote` (`cxasxpzfeydwnzvpdtkf`). Ces deux valeurs sont publiques par conception ; ne jamais placer de clé `service_role` dans le frontend.

## Préparer Supabase

Après avoir créé puis lié un projet Supabase :

```powershell
supabase login
supabase link --project-ref cxasxpzfeydwnzvpdtkf
supabase db push --linked --dry-run
supabase db push
```

Le dépôt est déjà lié sur la machine de développement. Le dry-run permet de relire les migrations en attente avant toute application.

Dans **Authentication > Email Templates**, remplacer le contenu des modèles **Confirm signup** et **Magic Link** par celui de `supabase/templates/magic_link.html`. La première connexion d’un pratiquant utilise **Confirm signup**, puis les connexions suivantes utilisent **Magic Link**. La présence de `{{ .Token }}` envoie le code OTP ; ne conserver `{{ .ConfirmationURL }}` dans aucun de ces deux modèles, car il enverrait un lien magique.

Pour les nouveaux projets Free créés après juin 2026, la personnalisation des emails nécessite un SMTP externe. Il se configure dans **Authentication > Email > SMTP Settings** avant d’enregistrer le modèle OTP.

Ne pas exécuter `supabase config push` avant d’avoir remplacé les URL locales de `supabase/config.toml` par l’URL GitHub Pages définitive : cette commande pousserait aussi la configuration Auth distante.

Créer ensuite l’utilisateur administrateur depuis le tableau de bord Supabase, puis ajouter son identifiant à la table des administrateurs :

```sql
insert into public.administrateurs (user_id)
select id from auth.users where email = 'admin@example.com';
```

Le formulaire administrateur refuse toujours la création automatique de comptes. Le formulaire **Mon carnet** autorise en revanche l’inscription d’un pratiquant par OTP. Pour l’activer sur le projet hébergé, autoriser les nouvelles inscriptions email dans **Authentication > Providers > Email**. Ne pas pousser globalement `supabase/config.toml` tant que les URL locales n’ont pas été remplacées par l’URL GitHub Pages définitive.

## Carnet pratiquant et classement

La migration `add_climber_logbook` ajoute les profils, les enchaînements, le barème et les politiques RLS. Avant application distante :

```powershell
supabase db push --linked --dry-run --skip-vault
```

Une fois la migration relue et appliquée, la page `#carnet` permet l’inscription et la saisie des voies ; `#classement` reste publique. Lorsqu’un pratiquant est connecté, chaque carte du topo permet aussi d’ajouter directement son enchaînement. Les voies déjà enregistrées prennent une teinte claire liée au style, et leur détail affiche les avis que leurs auteurs ont choisi de partager. Le score additionne les dix meilleures voies de la saison selon le barème `vertical-life-2026-v1` documenté dans `docs/OBJECTIF_ET_PERIMETRE.md`.

Le partage des enchaînements est facultatif et désactivé par défaut. Il rend visibles aux seuls pratiquants connectés le pseudo, le style, les étoiles, la cotation ressentie et le commentaire ; il n’expose jamais l’email, l’identifiant Auth ni le carnet brut.

La page `#potes` propose une recherche et une liste déroulante contenant tous les pseudos ayant activé le partage. Elle permet de suivre ou ne plus suivre un pratiquant, de distinguer « je suis » et « me suivent », puis de consulter les enchaînements partagés dans l’ordre chronologique. L’unique case **Partager mes enchaînements et commentaires avec les pratiquants connectés** se trouve dans les préférences du profil : l’activer donne accès à Potes, rend le pseudo découvrable et partage les enchaînements passés comme futurs dans les avis de voie et le fil des abonnés. Si elle est désactivée, la page devient inaccessible et le profil disparaît immédiatement de la recherche et des fils ; les relations sont conservées en base, mais restent invisibles jusqu’à une éventuelle réactivation.

La matrice SQL `supabase/tests/database/20260817_climber_logbook_rls.test.sql` vérifie les droits anon, pratiquant et administrateur, l’isolation entre deux pratiquants, le propriétaire imposé par `auth.uid()`, le RPC public et la conservation des carnets. Après `supabase start` et `supabase db reset`, l’exécuter avec :

```powershell
npm.cmd run test:db
```

## Organiser le topo

Dans l’administration, respecter cet ordre :

1. créer une saison et la rendre active ;
2. créer les zones puis régler leur ordre d’affichage ;
3. créer les relais et les rattacher à une zone ;
4. créer les couleurs et cotations, puis choisir leur difficulté (Facile, Modéré, Difficile ou Extrême) ;
5. revenir au topo public, activer le mode édition puis ajouter les voies depuis le groupe relais ou cotation voulu.

Activer une nouvelle saison désactive automatiquement l’ancienne, sans supprimer son topo. Le public et la liste de gestion affichent uniquement les voies de la saison active.
Les voies n’ont pas d’ordre manuel : le visiteur choisit un affichage regroupé par relais ou par cotation.

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
