# État du projet

Topopote : topo du mur de Saint-Pierre-en-Faucigny, carnet pratiquant, classement et suivis sociaux.
Session du 13 octobre 2026 : suppression demandée de la fonctionnalité privée Entraînement, frontend et backend, sans régression des autres pages.
État Git initial propre ; dernier commit observé : 606e053.
Suppression locale terminée et revue Tech Lead approuvée le 13 octobre 2026. Composants privés, props, types, styles et sélections d'accès retirés. Carnet partagé conservé ; styles d'enchaînement extraits dans `src/lib/ascentStyles.ts`. Ancien hash couvert via `pageFromHash`.
Migration additive `supabase/migrations/20261013000000_remove_training.sql` préparée, non appliquée ; historiques inchangés, aucun CASCADE ni modification du carnet. Matrice finale de retrait : 25 assertions, privilèges vérifiés séparément.
Validation finale : 49 tests frontend (13 fichiers), lint, build et diff check passent. Revue indépendante sans défaut bloquant dans le scope local. Avertissement build non bloquant : bundle supérieur à 500 kB.
Limite : Docker absent du PATH ; aucune exécution pgTAP ni preuve runtime de conservation sur base peuplée. Aucun déploiement distant autorisé dans cette session.
