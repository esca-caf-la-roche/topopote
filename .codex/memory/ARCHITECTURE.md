# Architecture

## Stack

- React 19, TypeScript and Vite.
- Supabase PostgreSQL, Auth email OTP and Row Level Security.
- Vitest and ESLint.
- GitHub Actions and GitHub Pages.

## Workspace structure

- `.codex/memory/`: project context files.
- `src/`: public topo and admin interface.
- `src/ClimberArea.tsx`: practitioner authentication, profile, logbook, dashboard and public leaderboard.
- `src/lib/scoring.ts`: versioned client-side score explanation and dashboard calculation.
- `supabase/migrations/`: database schema and RLS policies.
- `docs/`: scope and architecture documentation.
- `.github/workflows/`: GitHub Pages deployment.

## Data flow

Public clients read `saisons`, `zones`, `voies`, `relais`, `couleurs`, and `cotations`. Each route belongs to a season, and each relay belongs to a zone. Authenticated users can write only when their `auth.users.id` exists in `administrateurs`; this is enforced by RLS through a helper in the non-exposed `private` schema.

Practitioners store only a public nickname and ranking consent in `profils`; emails remain in Supabase Auth. `enchainements` is private to its owner and administrators. The public `classement_saison` RPC returns opted-in aggregate statistics without emails, comments or user UUIDs. Scores are recomputed from canonical route grades and the ten best results for the selected season.
