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

Public clients read `voies`, `relais`, `couleurs`, and `cotations`. Authenticated users can write only when their `auth.users.id` exists in `administrateurs`; this is enforced by RLS.
