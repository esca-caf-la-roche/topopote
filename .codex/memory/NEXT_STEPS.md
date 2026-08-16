# Next Steps

## Immediate (next session)

- [ ] Apply `20260816221927_add_climber_logbook.sql` to a disposable/test Supabase project.
- [ ] Run the prepared 18-assertion pgTAP matrix: anon, practitioner A, practitioner B and admin, including spoofed ownership and the public RPC.
- [ ] Validate real OTP sign-up, profile consent changes, create/edit/delete logbook entries and score refresh.

## Short Term

- [ ] Review all phase 2 changes, then commit them with a Conventional Commit once integration evidence is green.
- [ ] Enable hosted email sign-up and install the neutral OTP template without pushing local callback URLs.
- [ ] Configure GitHub Pages secrets, push `main`, and verify the deployment workflow and public site separately.

## Backlog

- [ ] Add SQL integration tests and a database-backed score parity test.
- [ ] Consider moderation/audit, project attempts and frozen scoring snapshots only after real usage justifies them.
