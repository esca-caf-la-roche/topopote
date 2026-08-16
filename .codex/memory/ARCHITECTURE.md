# Architecture

## Stack

- React 19, TypeScript and Vite.
- Supabase PostgreSQL, Auth email OTP and Row Level Security.
- Vitest and ESLint.
- GitHub Actions and GitHub Pages.

## Workspace structure

- `.codex/memory/`: project context files.
- `src/`: public topo and admin interface.
- `supabase/migrations/`: database schema and RLS policies.
- `docs/`: scope and architecture documentation.
- `.github/workflows/`: GitHub Pages deployment.

## Data flow

Public clients read `saisons`, `zones`, `voies`, `relais`, `couleurs`, and `cotations`. Each route belongs to a season, and each relay belongs to a zone. Authenticated users can write only when their `auth.users.id` exists in `administrateurs`; this is enforced by RLS through a helper in the non-exposed `private` schema.
