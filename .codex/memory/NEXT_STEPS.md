# Next Steps

## Immediate (next session)

- [ ] Validate with two real accounts: modal details, direct add, private/shared consent, card colors, carnet-to-topo refresh and keyboard focus.
- [ ] Validate the deployed `#potes` flow with three real accounts: searchable dropdown, strict private/shared access, incoming/outgoing relations, reciprocal follow, withdrawal and chronological feed.
- [ ] Validate real OTP sign-up and confirm the neutral six-digit hosted email template.

## Short Term

- [ ] Enable hosted email sign-up and install the neutral OTP template without pushing local callback URLs.
- [ ] Rerun both database matrices after the Potes fixture correction and verify every assertion in CI.
- [ ] Apply and verify every pending Supabase migration before publishing a frontend that depends on it.
- [ ] Rerun the GitHub Pages workflow and verify that its deployed SHA matches the validated `main` commit.

## Backlog

- [ ] Add React component tests for the route modal and a database-backed score parity test when the test environment supports them.
- [ ] Consider moderation/audit, project attempts and frozen scoring snapshots only after real usage justifies them.
- [ ] Consider follower blocking and server-side directory/feed pagination only if club usage or moderation needs justify them.
