# Project State

## Current phase

Phase 2 release stabilization: ranking, route-level sharing, opener feedback and practitioner following are on `main`, and their schema is deployed to Supabase. GitHub Pages still serves the previous successful commit because the current Potes pgTAP fixture blocks the deployment workflow.

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
- Added a shared role-aware primary navigation, guarded asynchronous role resolution and a 320 px overflow fix. Public sees only login, practitioners see ranking/logbook, and administrators see every destination.
- Applied `provision_admin_profiles` remotely so the existing and future administrators receive a private logbook profile on their existing Auth account. The remote pgTAP matrix now passes 19/19 assertions.
- Added a connected-topo flow locally: every route opens a focused modal, supports direct ascent entry, shows consented nicknames/stars/grade feelings/comments, and marks the current climber's completed routes with lighter style colors.
- Added a distinct private-by-default `partage_activite` consent and a narrow authenticated-only `avis_voie` RPC without email or user UUID; raw profile and logbook RLS remain unchanged.
- Extended the database matrix to 24 assertions for RPC privileges, route scoping and immediate consent withdrawal; added two presentation tests for the four style colors and the unique-route CTA state.
- Validated the local change with ESLint, 20/20 Vitest tests, a production build, a one-migration remote dry-run, public browser loading of 99 routes, and no horizontal overflow at 320 px.
- Applied `20260817072902_add_route_ascent_details.sql` to linked project `cxasxpzfeydwnzvpdtkf`; verified migration history, consent column defaults, authenticated-only RPC privileges and zero unauthenticated rows.
- Executed the 24-assertion pgTAP matrix remotely through a transaction: all assertions passed through `ok 24`, `finish()` reported no failure, and rollback verification found zero test users, profiles, zones or ascents.
- Re-ran Supabase advisors after migration: no performance warnings; only the intentional executable `SECURITY DEFINER` RPC warnings and the pre-existing password-protection warning remain.
- Added the local practitioner-following feature: `#potes` directory, discoverable opted-in profiles, one-way follow/unfollow, following/follower states and a 50-entry chronological friends feed.
- Kept activity sharing as a single profile preference; removed the duplicate control from `#potes` and clarified that the profile option also shares the nickname in the directory.
- Added an immutable random `profils.id_public` so follow actions never expose or depend on the Auth UUID and remain stable when a nickname changes.
- Added `suivis_pratiquants` with RLS defense in depth and three authenticated narrow RPCs; direct table access remains revoked.
- Made `partage_activite` the strict Potes gate: disabled profiles cannot access the directory/feed or follow actions, never appear in the search, and have past/future activity hidden immediately; stored relations remain invisible until reactivation.
- Closed the antagonist security findings for technical admin pseudonyms, legacy-profile discoverability, reciprocal-follow edge cases and mutable social identifiers.
- Applied `20260817094904_add_practitioner_following.sql`, `20260817102604_restrict_friends_to_shared_profiles.sql` and `20260817103738_enforce_generated_social_id.sql` to linked project `cxasxpzfeydwnzvpdtkf`; local and remote migration histories are aligned.
- Executed the 40 social pgTAP assertions against the deployed schema inside a rollback transaction; the final assertion passed and no test fixture persisted.
- Verified the deployed social table has RLS enabled, direct authenticated table reads are refused, authenticated RPC access is granted, anonymous annuaire access is refused, and every existing profile has a unique non-null public social ID.
- Re-ran Supabase advisors after deployment: no performance findings; only the intentional executable `SECURITY DEFINER` RPC warnings and the pre-existing OTP-irrelevant password-protection warning remain.
- Validated the frontend with ESLint, 37/37 Vitest tests, a production build, and a public browser check at 320 px without overflow or console errors.

## Remaining

- Validate a real practitioner OTP, authenticated logbook editing and leaderboard refresh end to end.
- Enable hosted email sign-up through the dashboard, then install/confirm the neutral six-digit OTP template.
- Validate the connected route modal, direct entry, consent withdrawal and color refresh end to end with two real practitioner accounts.
- Validate discoverability, reciprocal states, follow/unfollow and the chronological feed with at least three real practitioner accounts.
- Fix and rerun the Potes pgTAP matrix, then confirm that all database, build and deployment jobs pass and that GitHub Pages serves the validated commit SHA.

## Known issues and blockers

- The hosted project is linked and its schema is deployed.
- Docker/Podman is unavailable, so the migration cannot be tested with local Supabase containers.
- The route-details migration is applied remotely and aligned with local history.
- The current `main` workflow fails in the Potes pgTAP fixture before deployment because its test route is inserted without an active season.
- Hosted Supabase email sign-up must be enabled separately; changing `supabase/config.toml` does not prove the remote Auth setting.
- The public ranking RPC intentionally uses a narrowly scoped `SECURITY DEFINER`; Supabase advisors therefore report the expected anonymous/authenticated executable-function warnings.
- Password-leak protection remains disabled but is not used by the OTP-only flows.
- OTP behavior is not yet integration-tested; the latest Potes frontend has not yet been published.
- The authenticated route modal can now be exercised against the hosted project; two-account browser validation is still pending.
- The practitioner-following migration is applied remotely and aligned with local history; the friends frontend is on `main` but is not yet published by Pages.
- The friends directory and feed are intentionally MVP-bounded: client-side directory search and the 50 latest feed entries, without blocking or pagination yet.
