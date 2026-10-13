# Décisions

- Retirer la fonctionnalité Entraînement à la demande de l'utilisateur ; conserver le carnet classique.
- Conserver les migrations historiques et supprimer les objets dédiés via une nouvelle migration.
- Ne pas appliquer de migration distante, publier ou créer de commit sans demande.
- Ne pas afficher les secrets ni modifier `.env.local`.
- Livraison destructive : publier d'abord le frontend compatible avec l'ancien schéma, puis retirer les objets SQL après renouvellement des anciens clients. L'ancien frontend sélectionne explicitement `acces_entrainement` et ne supporte pas sa suppression immédiate (QA, 2026-10-13).
