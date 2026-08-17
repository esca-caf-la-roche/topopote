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
- `src/RouteAscentsModal.tsx`: authenticated route details, consented community reviews and direct ascent entry.
- `src/lib/routeAscents.ts`: route-card style colors, grade-feeling labels and unique-route CTA presentation.
- `src/lib/scoring.ts`: versioned client-side score explanation and dashboard calculation.
- `supabase/migrations/`: database schema and RLS policies.
- `docs/`: scope and architecture documentation.
- `.github/workflows/`: GitHub Pages deployment.

## Data flow

Public clients read `saisons`, `zones`, `voies`, `relais`, `couleurs`, and `cotations`. Each route belongs to a season, and each relay belongs to a zone. Authenticated users can write only when their `auth.users.id` exists in `administrateurs`; this is enforced by RLS through a helper in the non-exposed `private` schema.

Practitioners store a nickname plus separate ranking and activity-sharing consents in `profils`; emails remain in Supabase Auth. `enchainements` is private to its owner and administrators. The public `classement_saison` RPC returns opted-in aggregate statistics without emails, comments or user UUIDs. The authenticated-only `avis_voie` RPC returns only consented pseudo/style/note/feeling/comment fields for one route, always allowing the caller to see their own entry. Scores are recomputed from canonical route grades and the ten best results for the selected season.

The topo loads only the current climber's route IDs and styles for card coloring. Community route details are fetched lazily when a connected climber opens a route. Returning from the logbook refreshes this snapshot so profile consent and card colors cannot remain stale.
