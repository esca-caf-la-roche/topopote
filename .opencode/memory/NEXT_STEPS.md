# Prochaines étapes

1. Exécuter pgTAP sur une base Supabase locale disponible ; ici connexion refusée et Docker/Podman indisponibles.
2. Valider la migration sur une copie peuplée et comparer profils, enchaînements et relations sociales avant/après.
3. Si livraison demandée : publier d'abord le nouveau frontend compatible avec l'ancien schéma, vérifier les parcours et renouveler les clients ouverts.
4. Conserver l'ancien schéma si renouvellement des clients non garanti. Après sauvegarde restaurable et autorisation distincte, appliquer le retrait SQL définitif.
5. Aucun commit, push, déploiement ou migration distante effectué pendant cette intervention.
