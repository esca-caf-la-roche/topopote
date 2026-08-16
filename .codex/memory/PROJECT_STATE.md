# Project State

## Current phase

Initial MVP implementation linked to the hosted Topopote Supabase project, with seasonal and zoned route modeling deployed.

## Done

- Defined the public-topo MVP and its future personal-session extension.
- Selected React, TypeScript, Vite, Supabase and GitHub Pages.
- Added the initial application, database migration and deployment workflow.
- Renamed the product to Topopote.
- Added seasons, zones, season history, and zone-aware relay modeling locally.
- Linked project `cxasxpzfeydwnzvpdtkf` and applied the three initial migrations.
- Verified public loading, RLS denial for non-admin writes, single-active-season behavior, and responsive rendering.
- Cleared Supabase security and performance advisor warnings at WARN level.

## Remaining

- Configure custom SMTP if required, the OTP-only email template, and the first administrator.
- Add real wall reference data and routes.

## Known issues and blockers

- The hosted project is linked and its schema is deployed.
- Docker/Podman is unavailable, so the migration cannot be tested with local Supabase containers.
- New Free projects require custom SMTP before the OTP-only email template can be customized.
- GitHub Pages secrets are not configured yet.
