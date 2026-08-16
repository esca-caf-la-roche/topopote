# Project State

## Current phase

Initial MVP implementation linked to the hosted Topopote Supabase project, with seasonal and zoned route modeling deployed and the first administrator configured.

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

## Remaining

- Add real wall reference data and routes.
- Configure the GitHub repository under `esca-caf-la-roche` and publish GitHub Pages.

## Known issues and blockers

- The hosted project is linked and its schema is deployed.
- Docker/Podman is unavailable, so the migration cannot be tested with local Supabase containers.
- GitHub Pages secrets are not configured yet.
- No Git remote is configured, and the GitHub CLI must be authenticated as `esca-caf-la-roche` before any push.
