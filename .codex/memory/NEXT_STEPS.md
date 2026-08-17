# Next Steps

## Immediate (next session)

- [ ] Validate with two real accounts: modal details, direct add, private/shared consent, card colors, carnet-to-topo refresh and keyboard focus.
- [ ] Validate the deployed `#potes` flow with three real accounts: searchable dropdown, strict private/shared access, incoming/outgoing relations, reciprocal follow, withdrawal and chronological feed.
- [ ] Validate real OTP sign-up and confirm the neutral six-digit hosted email template.

## Short Term

- [ ] Enable hosted email sign-up and install the neutral OTP template without pushing local callback URLs.
- [ ] Commit the validated route-details feature and the existing local phase-2 navigation/profile work.
- [ ] Commit the validated following feature with its migration, pgTAP matrix, frontend and documentation before publishing.
- [ ] Configure GitHub Pages secrets, push `main`, and verify the deployment workflow and public site separately.

## Backlog

- [ ] Add React component tests for the route modal and a database-backed score parity test when the test environment supports them.
- [ ] Consider moderation/audit, project attempts and frozen scoring snapshots only after real usage justifies them.
- [ ] Consider follower blocking and server-side directory/feed pagination only if club usage or moderation needs justify them.
