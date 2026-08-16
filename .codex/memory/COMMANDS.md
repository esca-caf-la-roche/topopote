# Commands

## Development

```powershell
npm.cmd install
npm.cmd run dev
```

## Verification

```powershell
npm.cmd run lint
npm.cmd run test
npm.cmd run build
```

## Supabase

```powershell
supabase link --project-ref cxasxpzfeydwnzvpdtkf
supabase db push --linked --dry-run
supabase db push
supabase migration list --linked
supabase db advisors --linked --type security
supabase db advisors --linked --type performance
```

## Repository inspection

```powershell
git status --short
git log --oneline -10
```

Add development, test, formatting, and deployment commands once the project stack is initialized.
