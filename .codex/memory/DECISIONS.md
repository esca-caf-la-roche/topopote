# Decisions

## Current conventions

- Work directly on the `main` branch unless a future project decision specifies otherwise.
- Use Conventional Commit messages: `feat(scope): description` or `fix(scope): description`.
- Do not add author attributions such as "Created by Codex" to file headers.

## Architecture decisions

- Host the static React frontend on GitHub Pages and keep data/auth in Supabase.
- Use separate reference tables for relays, colors, and grades; grades carry an explicit numeric rank.
- Keep topo reads public and protect all writes with database RLS.
- Use email OTP codes only. The client prevents sign-up and the email template contains `{{ .Token }}` rather than a magic link.
- Keep stable route identifiers so personal sessions can reference routes in phase two.
- Keep all seasonal route sets instead of overwriting routes during the twice-yearly renewal.
- Allow exactly one active season and impose it as the only visible season in the public topo.
- Keep seasons deliberately date-free in the application; retain nullable legacy database columns so the migration stays reversible.
- Attach each relay to an ordered zone; zones describe stable physical wall sections.
- Use a dedicated `#admin` page instead of a modal so the static GitHub Pages deployment needs no server-side route rewriting.
- Publish the repository only under the GitHub owner `esca-caf-la-roche`, never under `JeanFi675`.

## Session decisions

| Decision | Rationale | Date |
|----------|-----------|------|
| Group public filters into zone/relay, grade/difficulty, and color frames, then separate display preferences | Match the user's mental model, expose the real dependency between zone and relay, and keep filtering distinct from grouping and reset actions | 2026-08-16 |
| Use an accessible reusable neo-brutalist switch for half routes and relay/grade grouping | Preserve the visual language while keeping keyboard navigation and explicit switch semantics | 2026-08-16 |
| Replace 8a.nu's rolling 12-month window with the route's Topopote season and sum the ten best unique routes | Match the local wall renewal model while keeping a recognizable, explainable scoring game | 2026-08-17 |
| Keep profiles private by default and expose the public leaderboard through a narrow aggregate RPC | Make ranking consent reversible and prevent public access to emails, comments and raw logbooks | 2026-08-17 |
| Protect routes referenced by logbooks with `ON DELETE RESTRICT` | Preserve practitioner history instead of silently cascading route deletion into personal data loss | 2026-08-17 |
| Keep administrators in the existing `administrateurs` table rather than adding a mutable profile role | Preserve the current server-side authorization contract and avoid user-controlled role metadata | 2026-08-17 |
| Keep raw logbooks private and expose route opinions through `avis_voie` with a separate `partage_activite` consent | Support the connected social topo without silently reusing ranking consent or exposing emails, UUIDs and unrelated carnet data | 2026-08-17 |
| Color a completed route only from the current climber's style | Avoid an ambiguous card color when several practitioners used different ascent styles | 2026-08-17 |
| Reuse `partage_activite` as the strict gate for social discovery, Potes access and feed visibility | Keep one explicit privacy control as requested; private profiles neither enter Potes nor appear there, while stored relationships can survive a reversible withdrawal | 2026-08-17 |
| Follow profiles through an immutable random `id_public`, never the nickname or Auth UUID | Prevent rename races and avoid exposing privileged authentication identifiers to clients | 2026-08-17 |
