# Deployment Runbook

## Purpose

This is the operational runbook for deploying and maintaining `PoB Codes` on Cloudflare.

Use this document for:

- the ongoing release workflow
- required GitHub secrets and variables
- manual deployment fallback commands
- production smoke tests
- common recovery steps

## Production Topology

- `https://pob.codes`: Next.js app deployed to Cloudflare Workers from `apps/web`
- `https://api.pob.codes`: API Worker deployed from `apps/worker`
- Cloudflare KV `BUILD_CODES`: stores uploaded raw PoB codes and parsed payload cache
- GitHub Actions workflow: `.github/workflows/deploy.yml`
- Worker-side POST rate limiting: enabled by default in production

## Repository Inputs

### GitHub Secrets

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`

### GitHub Repository Variables

- `CF_KV_BUILD_CODES_ID`
- `CF_KV_BUILD_CODES_PREVIEW_ID`

## Normal Release Workflow

1. Make changes locally.
2. Run `npm.cmd run verify`.
3. Push the branch and open a PR if you want review.
4. Merge or push to `main`.
5. GitHub Actions runs `Verify and Deploy`.
6. Smoke-test production after meaningful changes.

## Local Commands

### Development

- Start both local servers: `npm.cmd run dev:restart`
- Start only the web app: `npm.cmd run dev:web`
- Start only the worker: `npm.cmd run dev:worker`

### Validation

- Full local validation: `npm.cmd run verify`
- Manual split:
  - `npm.cmd run build`
  - `npm.cmd run typecheck`
  - `npm.cmd run test`

### Production Preview

- Preview the web app in the Workers runtime: `npm.cmd run preview:web`

## Manual Deployment Fallback

Use this only if GitHub Actions is unavailable or if you need to debug the deployment locally.

### Required Local Environment Variables

- `CLOUDFLARE_ACCOUNT_ID`
- `CLOUDFLARE_API_TOKEN`
- `CF_KV_BUILD_CODES_ID`
- `CF_KV_BUILD_CODES_PREVIEW_ID`

For PowerShell:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID="..."
$env:CLOUDFLARE_API_TOKEN="..."
$env:CF_KV_BUILD_CODES_ID="..."
$env:CF_KV_BUILD_CODES_PREVIEW_ID="..."
```

### Manual Deploy Commands

- Deploy both services: `npm.cmd run deploy`
- Deploy only the worker: `npm.cmd run deploy:worker`
- Deploy only the web app: `npm.cmd run deploy:web`

## Worker Runtime Defaults

The production worker template currently sets:

- `BASE_URL=https://pob.codes`
- `PARSED_PAYLOAD_CACHE_ENABLED=true`
- `PARSED_PAYLOAD_CACHE_VERSION=1`
- `PARSED_PAYLOAD_TTL_SECONDS=2592000`
- `JSON_RESPONSE_EDGE_CACHE_ENABLED=true`
- `RATE_LIMIT_ENABLED=true`
- `RATE_LIMIT_MAX_REQUESTS=30`
- `RATE_LIMIT_WINDOW_SECONDS=60`

## Smoke Tests

### Basic Reachability

- Open `https://pob.codes`
- Open `https://api.pob.codes/pob` with `OPTIONS` and expect `204`

### Upload Round Trip

Use a sample PoB payload from `data/` and post it to the API:

```powershell
$body = Get-Content -Raw -LiteralPath 'data\exsanguinate trickster 328.txt'
Invoke-RestMethod -Uri 'https://api.pob.codes/pob' -Method Post -Body $body -ContentType 'text/plain'
```

Expected result:

- JSON response with `id`
- `shortUrl` of the form `https://pob.codes/b/<id>`

Then verify:

- `https://pob.codes/b/<id>` returns `200`
- `https://api.pob.codes/<id>/json` returns `200`

## GitHub Actions

### Workflow

- File: `.github/workflows/deploy.yml`
- Triggered on:
  - pull requests for validation only
  - pushes to `main` for validation plus deployment
  - manual dispatch

### Job Order

1. `npm ci`
2. `npm run build`
3. `npm run typecheck`
4. `npm run test`
5. `npm run deploy:worker`
6. `npm run deploy:web`

## Troubleshooting

### Cloudflare Authentication Error

If deployment fails with Cloudflare auth errors:

1. Recreate the API token in the correct Cloudflare account.
2. Update the GitHub secret `CLOUDFLARE_API_TOKEN`.
3. Rerun the failed workflow.

Use:

```powershell
gh run rerun <run-id> --repo AdamZ-8113/pob-codes
```

### Missing KV IDs

If the workflow fails before worker deploy with missing render inputs:

1. Check `CF_KV_BUILD_CODES_ID`
2. Check `CF_KV_BUILD_CODES_PREVIEW_ID`
3. Confirm both exist as GitHub repository variables

### Web Typecheck Fails On Clean Checkout

`apps/web` typechecking currently depends on `.next/types`, so `build` must run before `typecheck`.

This is why the workflow and `npm run verify` use:

1. `build`
2. `typecheck`
3. `test`

## Current Known Gaps

- `www.pob.codes` behavior is still undecided
- There are no preview deployments for pull requests yet
- The worker-side rate limit is a simple KV-backed backstop, not a full edge-grade abuse prevention system
