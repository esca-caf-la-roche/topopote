# topopote

Le topo sans prise de tête du mur d’escalade de Saint-Pierre-en-Faucigny. Les administrateurs gèrent le topo et ses référentiels ; chaque pratiquant gère uniquement son profil, son carnet et ses suivis.

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

Le dépôt est déjà lié sur la machine de développement. Le dry-run permet de relire les migrations en attente avant toute application. **Sur un projet existant, ne pas appliquer `20261013000000_remove_training.sql` avant la procédure frontend-first ci-dessous.**

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

Le partage des enchaînements est facultatif et désactivé par défaut. Il rend visibles aux seuls pratiquants connectés le pseudo, le style, les étoiles, la cotation ressentie et le commentaire ; il n’expose jamais l’email, l’identifiant Auth ni le carnet brut. Ce consentement communautaire ne masque pas les retours aux ouvreurs et administrateurs : leurs pages de suivi affichent tous les retours enregistrés, y compris lorsque le pratiquant ne partage pas son activité avec la communauté.

La page `#potes` propose une recherche et une liste déroulante contenant tous les pseudos ayant activé le partage. Elle permet de suivre ou ne plus suivre un pratiquant, de distinguer « je suis » et « me suivent », puis de consulter les enchaînements partagés dans l’ordre chronologique. L’unique case **Partager mes enchaînements et commentaires avec les pratiquants connectés** se trouve dans les préférences du profil : l’activer donne accès à Potes, rend le pseudo découvrable et partage les enchaînements passés comme futurs dans les avis de voie et le fil des abonnés. Si elle est désactivée, la page devient inaccessible et le profil disparaît immédiatement de la recherche et des fils ; les relations sont conservées en base, mais restent invisibles jusqu’à une éventuelle réactivation.

Les matrices pgTAP `supabase/tests/database/20260817_climber_logbook_rls.test.sql` et `supabase/tests/database/20260817_practitioner_following_rls.test.sql` vérifient respectivement le carnet, les retours ouvreurs et le classement, puis l’annuaire Potes, les suivis, le fil et le retrait du consentement. Elles couvrent les droits anon, pratiquant, ouvreur et administrateur, l’isolation entre pratiquants, les propriétaires imposés par `auth.uid()` et les RPC exposés. Après `supabase start` et `supabase db reset`, les exécuter ensemble avec :

```powershell
npm.cmd run test:db
```

## Retrait de l’entraînement — livraison en deux temps

La page, son menu, le suivi des séances/charges/douleurs et le préremplissage depuis les séances sont supprimés. Un ancien lien `#entrainement` se replie sur le topo. Le carnet d’enchaînements, les profils, le classement, Potes et les retours ouvreurs restent disponibles. Les règles de style selon le nombre d’essais restent partagées entre le carnet et le modal du topo.

La migration **destructive** `20261013000000_remove_training.sql` supprime `voies_seance`, `seances_entrainement`, `activites_charge`, leurs objets dédiés et `profils.acces_entrainement`, sans `CASCADE`. Elle efface définitivement les données d’entraînement, pas les enchaînements déjà enregistrés : la FK est `voies_seance.enchainement_id → enchainements.id ON DELETE SET NULL`, et non l’inverse. Les migrations historiques restent intactes.

**Exception obligatoire à la checklist DB-before-front :**

1. Valider puis déployer d’abord ce nouveau frontend, compatible avec l’ancien schéma comme avec le schéma final. Vérifier le SHA publié et tester carnet, topo connecté, classement, Potes et rôles privilégiés.
2. Conserver temporairement l’ancien schéma pour les anciens onglets/clients encore ouverts. L’ancien `App` et l’ancien `ClimberArea` sélectionnent `acces_entrainement` : retirer la colonne trop tôt bloque leur carnet. Renouveler les clients avant de poursuivre ; un déploiement seul ne recharge pas leurs onglets.
3. Sauvegarder la base et vérifier la restauration. Sur une copie locale peuplée de l’ancien schéma, relever les lignes et valeurs des profils, enchaînements, topo et suivis ; appliquer seulement la nouvelle migration, comparer intégralement ces données avant/après et retester les permissions. Exporter les données d’entraînement si elles doivent être archivées.
4. Seulement après validation et renouvellement des clients, autoriser séparément l’application distante de la migration, puis contrôler données conservées, historique des migrations et accès. Aucun automatisme de publication frontend ne doit appliquer ce drop.

La matrice `supabase/tests/database/20261013_training_removed.test.sql` contrôle les absences et le maintien des tables/RLS/droits utiles ; les matrices carnet et Potes restent exécutées. **Des tests pgTAP sur le schéma final reconstruit ne prouvent pas la préservation des données historiques lors d’une mise à niveau peuplée.** Cette validation reste une étape distincte obligatoire. Aucun retour arrière vers l’ancien frontend après le drop sans restauration de son contrat de base ; les données supprimées nécessitent une sauvegarde.

## Organiser le topo

Dans l’administration, respecter cet ordre :

1. créer une saison et la rendre active ;
2. créer les zones puis régler leur ordre d’affichage ;
3. créer les relais et les rattacher à une zone ;
4. créer les couleurs et cotations, puis choisir leur difficulté (Facile, Modéré, Difficile ou Extrême) ;
5. revenir au topo public, activer le mode édition puis ajouter les voies depuis le groupe relais ou cotation voulu.

Activer une nouvelle saison désactive automatiquement l’ancienne, sans supprimer son topo. Le public et la liste de gestion affichent uniquement les voies de la saison active. Une saison active est également obligatoire pour créer une voie : la base ignore la saison proposée par le client, rattache la voie à la saison active et refuse l’écriture si aucune saison n’est active.
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

GitHub Pages ne déploie que le frontend : le workflow teste les migrations sur une base Supabase locale, mais ne modifie jamais le projet hébergé. **La suppression de l’entraînement suit exclusivement la procédure frontend-first ci-dessus.** Pour les autres versions ajoutant une migration dont le frontend dépend, respecter cette checklist avant de pousser `main` :

1. relire les migrations en attente avec `supabase db push --linked --dry-run --skip-vault` ;
2. appliquer les migrations validées avec `supabase db push --linked --skip-vault` ;
3. confirmer avec `supabase migration list --linked` que l’historique local et distant est aligné ;
4. pousser `main`, puis attendre que les jobs `database-tests`, `build` et `deploy` soient tous verts ;
5. vérifier que le SHA du déploiement GitHub Pages correspond exactement au commit validé, puis effectuer un contrôle rapide du topo public et des pages authentifiées concernées.

Le build de production échoue volontairement si l’un des deux secrets Vite est absent, sans afficher leurs valeurs. Une compilation locale ou un artefact chargé ne prouve donc pas à lui seul que la version attendue est publiée : le job `deploy` et son SHA font foi.

Le périmètre fonctionnel détaillé se trouve dans `docs/OBJECTIF_ET_PERIMETRE.md` et les choix techniques dans `docs/ARCHITECTURE.md`.
