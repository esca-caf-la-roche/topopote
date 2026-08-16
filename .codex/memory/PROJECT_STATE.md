# Project State

## Current phase

Functional MVP linked to the hosted Topopote Supabase project, populated with the current wall topo and undergoing final UX refinement before GitHub publication.

## Done

- Defined the public-topo MVP and its future personal-session extension.
- Selected React, TypeScript, Vite, Supabase and GitHub Pages.
- Added the initial application, database migration and deployment workflow.
- Renamed the product to Topopote.
- Added seasons, zones, season history, and zone-aware relay modeling locally.
- Linked project `cxasxpzfeydwnzvpdtkf` and applied the three initial migrations.
- Verified public loading, RLS denial for non-admin writes, single-active-season behavior, and responsive rendering.
- Cleared Supabase security and performance advisor warnings at WARN level.
- Configured custom SMTP, the six-digit OTP template, disabled public sign-up, and added the first administrator.
- Limited the public topo to the administrator-selected active season.
- Replaced the administration modal with a dedicated `#admin` page.
- Removed season dates from the application while retaining nullable legacy database columns for a reversible migration.
- Added the February 2026 wall references and routes, including half routes, contextual route editing, and grouping by relay or grade.
- Added editable grade difficulties and public filtering by difficulty.
- Redesigned the public filters into neo-brutalist semantic groups: zone/relay, grade/difficulty, and color.
- Added accessible neo-brutalist switches for half-route visibility and relay/grade grouping, with responsive desktop and mobile layouts.
- Validated the filter redesign with ESLint, the 8 Vitest tests, the production build, browser interaction checks, and responsive inspection down to the project's minimum width.

## Remaining

- Review and commit the validated filter redesign currently present in `src/App.tsx` and `src/styles.css`.
- Configure the GitHub repository under `esca-caf-la-roche` and publish GitHub Pages.

## Known issues and blockers

- The hosted project is linked and its schema is deployed.
- Docker/Podman is unavailable, so the migration cannot be tested with local Supabase containers.
- GitHub Pages secrets are not configured yet.
- No Git remote is configured, and the GitHub CLI must be authenticated as `esca-caf-la-roche` before any push.
- The filter redesign is validated locally but remains uncommitted; no publication or production deployment has been performed for it.
