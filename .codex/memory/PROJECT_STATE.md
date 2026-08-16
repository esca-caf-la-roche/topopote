# Project State

## Current phase

Phase 2 integration in progress: the practitioner schema and seasonal ranking are deployed to Supabase, while the frontend commit remains local and unpushed.

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
- Added a distinct OTP practitioner flow, private-by-default profiles, editable privacy preferences, personal logbook and seasonal dashboard.
- Added the `vertical-life-2026-v1` scoring rule: top 10 unique routes per season, with style modifiers inspired by the current 8a.nu/Vertical-Life scale.
- Added a public seasonal leaderboard that exposes only opted-in nicknames and aggregates, plus a practitioner activity summary for administrators.
- Created the local `add_climber_logbook` migration with explicit grants, RLS ownership rules, protected route history, indexes and a restricted aggregate RPC.
- Validated the current frontend with ESLint, 15 Vitest tests, a production build and public/mobile browser checks at 375 px.
- Closed the final review findings: anonymous clients cannot read `profils` directly, stale personal requests are discarded, and the final security re-review found no remaining blocker in the local diff.
- Added an 18-assertion transactional pgTAP matrix covering anon, two practitioners, one administrator, ownership spoofing, public ranking and route-history protection.
- Applied `add_climber_logbook` and `optimize_profile_policies` to linked project `cxasxpzfeydwnzvpdtkf`; the remote migration history is aligned.
- Executed the full pgTAP matrix remotely with 18/18 passing assertions and verified that all test users, profiles, zones and ascents were rolled back.
- Verified the local frontend against the migrated remote schema: public seasons, empty seasonal ranking and anonymous practitioner sign-in view load without console errors.

## Remaining

- Validate a real practitioner OTP, authenticated logbook editing and leaderboard refresh end to end.
- Enable hosted email sign-up through the dashboard, then install/confirm the neutral six-digit OTP template.
- Commit the RLS policy optimization before publishing.

## Known issues and blockers

- The hosted project is linked and its schema is deployed.
- Docker/Podman is unavailable, so the migration cannot be tested with local Supabase containers.
- GitHub Pages secrets are not configured yet.
- Hosted Supabase email sign-up must be enabled separately; changing `supabase/config.toml` does not prove the remote Auth setting.
- The public ranking RPC intentionally uses a narrowly scoped `SECURITY DEFINER`; Supabase advisors therefore report the expected anonymous/authenticated executable-function warnings.
- Password-leak protection remains disabled but is not used by the OTP-only flows.
- OTP behavior is not yet integration-tested; no frontend publication or production deployment has been performed for phase 2.
