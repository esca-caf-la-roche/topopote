# Architecture

- React 19, TypeScript, Vite ; sources dans `src/`.
- Supabase : PostgreSQL, Auth OTP, RLS, migrations dans `supabase/migrations/`.
- Vitest et Testing Library ; tests SQL pgTAP dans `supabase/tests/database/`.
- GitHub Actions et GitHub Pages pour le frontend ; migration distante séparée.
- Références détaillées : `docs/ARCHITECTURE.md`, `docs/OBJECTIF_ET_PERIMETRE.md`.
- Préserver `profils`, `enchainements`, topo, classement et suivis sociaux lors du retrait d'Entraînement.
