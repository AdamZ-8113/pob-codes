# Deployment Plan

## Purpose

This document is the implementation plan for deploying the site to `pob.codes` on Cloudflare and setting up a repeatable local-to-production workflow.

It is intentionally written as a deferred execution checklist. We can come back to it later and implement it phase by phase.

## Recommended Target Architecture

- `pob.codes`: Next.js web app deployed to Cloudflare Workers via OpenNext.
- `api.pob.codes`: existing Cloudflare Worker in `apps/worker`.
- Cloudflare KV: backing store for uploaded raw PoB codes and parsed payload cache.
- GitHub: source of truth plus CI/CD deployment trigger.

## Why This Shape

- The web app already supports a separately configured API origin via `POB_CODES_API_BASE` and `NEXT_PUBLIC_API_BASE`.
- The Worker is already a real production dependency, not just a dev helper.
- Keeping the API on `api.pob.codes` avoids path-routing complexity and fits the current code cleanly.
- GitHub Actions is the simplest way to deploy both services together from one monorepo.

## Current Repo Facts

- Root workspace scripts already exist for `build`, `test`, `typecheck`, `dev:web`, and `dev:worker`.
- The web app lives in `apps/web`.
- The API Worker lives in `apps/worker`.
- The Worker expects a KV binding named `BUILD_CODES`.
- The Worker already supports production env vars such as `BASE_URL`, `PARSED_PAYLOAD_CACHE_VERSION`, and `JSON_RESPONSE_EDGE_CACHE_ENABLED`.

## Important Current Constraint

On a clean checkout, `apps/web` typechecking depends on generated `.next/types` files. That means the safe validation order is:

1. `npm.cmd run build`
2. `npm.cmd run typecheck`
3. `npm.cmd run test`

This ordering should be used in CI unless the web workspace is adjusted later so `typecheck` can run before `build`.

## Phase 0: Accounts And Access

### Goal

Make sure the external accounts and permissions are ready before touching repo config.

### Tasks

1. Confirm the `pob.codes` zone is active in Cloudflare DNS.
2. Decide whether `www.pob.codes` will redirect to `pob.codes` or also serve the app.
3. Create a GitHub repository for this codebase if one does not already exist.
4. Confirm the Cloudflare account ID that will own both Workers and the KV namespace.
5. Create a Cloudflare API token suitable for CI/CD.

### Output

- Active Cloudflare zone for `pob.codes`
- GitHub repo
- Cloudflare account ID
- Cloudflare API token stored securely

## Phase 1: Local Workflow Baseline

### Goal

Standardize the local commands that must pass before any deployment.

### Tasks

1. Use `npm.cmd` in PowerShell to avoid local execution-policy issues with `npm.ps1`.
2. Use these local dev commands:
   - `npm.cmd run dev:web`
   - `npm.cmd run dev:worker`
3. Use this local verification sequence before a deploy:
   - `npm.cmd run build`
   - `npm.cmd run typecheck`
   - `npm.cmd run test`
4. Keep `npm install` at the repo root as the normal dependency install path.

### Output

- Known-good local workflow for development and release validation

## Phase 2: Web App Cloudflare Integration

### Goal

Make `apps/web` deployable to Cloudflare Workers.

### Tasks

1. Add Cloudflare/OpenNext support to `apps/web`.
2. Add the Cloudflare-compatible config files required for a Next.js Workers deployment.
3. Add `apps/web` deploy scripts for preview and production.
4. Add environment handling for production API calls:
   - `POB_CODES_API_BASE=https://api.pob.codes`
   - `NEXT_PUBLIC_API_BASE=https://api.pob.codes`
5. Preserve the current local dev behavior where the web app uses `http://localhost:8787` by default.

### Expected Repo Changes Later

- Add OpenNext/Cloudflare package dependencies to `apps/web`
- Add a Wrangler config for `apps/web`
- Add an OpenNext config for `apps/web`
- Add scripts such as `preview` and `deploy` in `apps/web/package.json`

### Output

- `apps/web` can be built and deployed as a Cloudflare-hosted Next.js app

## Phase 3: Worker Production Configuration

### Goal

Prepare `apps/worker` for a real production deploy under `api.pob.codes`.

### Tasks

1. Replace the placeholder KV IDs in `apps/worker/wrangler.toml`.
2. Create or bind a real KV namespace for `BUILD_CODES`.
3. Set Worker production vars:
   - `BASE_URL=https://pob.codes`
   - `PARSED_PAYLOAD_CACHE_ENABLED=true`
   - `PARSED_PAYLOAD_CACHE_VERSION=1`
   - `PARSED_PAYLOAD_TTL_SECONDS=2592000`
   - `JSON_RESPONSE_EDGE_CACHE_ENABLED=true`
4. Optionally set `MAX_UPLOAD_SIZE` later if production limits need tuning.
5. Confirm the Worker responds correctly for:
   - `POST /pob`
   - `POST /pob/parse`
   - `GET /:id/raw`
   - `GET /:id/json`

### Output

- Production-ready Worker config
- Real KV namespace attached to the Worker

## Phase 4: Cloudflare Domain Wiring

### Goal

Attach the public domain names to the right Cloudflare services.

### Tasks

1. Attach `api.pob.codes` to the API Worker.
2. Attach `pob.codes` to the web app Worker.
3. Decide whether to attach `www.pob.codes` directly or redirect it to `pob.codes`.
4. Verify DNS and custom-domain status in Cloudflare after the first deploy.

### Output

- `https://pob.codes` serves the web UI
- `https://api.pob.codes` serves the API Worker

## Phase 5: First Manual Production Deploy

### Goal

Do one controlled, manual production deployment before automating anything.

### Tasks

1. Log in locally with Wrangler.
2. Deploy the API Worker first.
3. Deploy the web app second.
4. Set production env vars in Cloudflare for both deploy targets.
5. Attach the custom domains.
6. Run smoke tests against production:
   - homepage loads
   - sample build upload works
   - `/b/<id>` loads correctly
   - returned short URLs use `https://pob.codes/b/<id>`
   - raw-code copy flow still works

### Output

- First working production release on Cloudflare

## Phase 6: GitHub CI/CD

### Goal

Make routine updates low-friction and predictable.

### Recommended Approach

Use GitHub Actions from the repo root instead of relying on separate Cloudflare dashboard build flows.

### Why

- One monorepo contains both deploy targets.
- Shared packages need to build consistently for both the web app and the Worker.
- One workflow can validate once, then deploy both targets in order.

### Tasks

1. Add a GitHub Actions workflow at `.github/workflows/deploy.yml`.
2. Trigger it on pushes to `main`.
3. In the workflow:
   - check out the repo
   - install dependencies with `npm ci`
   - run `npm run build`
   - run `npm run typecheck`
   - run `npm run test`
   - deploy `apps/worker`
   - deploy `apps/web`
4. Store CI secrets in GitHub:
   - `CLOUDFLARE_ACCOUNT_ID`
   - `CLOUDFLARE_API_TOKEN`
5. Add a PR validation workflow later if desired, using the same verification steps without production deploy.

### Output

- Every merge to `main` automatically deploys the latest passing build

## Phase 7: Routine Update Workflow

### Goal

Define the normal day-to-day release process after the initial setup is complete.

### Workflow

1. Make code changes locally.
2. Run:
   - `npm.cmd run build`
   - `npm.cmd run typecheck`
   - `npm.cmd run test`
3. Push the branch to GitHub.
4. Open and review a PR.
5. Merge to `main`.
6. Let GitHub Actions deploy production automatically.
7. Smoke-test the production site after important changes.

### Output

- Predictable and low-effort production updates

## Deferred Repo Changes To Implement Later

These are not done yet. They are the likely code/config changes to make when we return to this plan.

1. Add Cloudflare/OpenNext config to `apps/web`.
2. Replace placeholder KV namespace IDs in `apps/worker/wrangler.toml`.
3. Add root-level helper scripts for deploy and CI verification if useful.
4. Add GitHub Actions workflow files.
5. Add a short deployment runbook section to `README.md` after the process is working.

## Acceptance Checklist

The deployment work is complete when all of the following are true:

- `https://pob.codes` serves the app successfully.
- `https://api.pob.codes` serves the Worker successfully.
- Uploading a PoB code creates a working short URL.
- Visiting `/b/<id>` loads the parsed build correctly.
- Production short URLs point at `https://pob.codes/b/<id>`.
- KV storage is working in production.
- Local verification commands are documented and reliable.
- A merge to `main` can deploy the app without manual file edits in Cloudflare.

## Open Questions

1. Should `www.pob.codes` redirect to the apex domain or serve the app directly?
2. Do we want preview deployments for pull requests, or only production deploys on `main`?
3. Do we want to keep the current `typecheck after build` requirement, or fix the web workspace so typechecking works on a clean checkout without a prior build?

## Suggested Execution Order When We Return

1. Put the repo on GitHub if it is not there yet.
2. Add the Cloudflare/OpenNext config for `apps/web`.
3. Provision real KV and production Worker config.
4. Perform one manual deployment.
5. Add GitHub Actions automation.
6. Do one small no-risk follow-up change to prove the pipeline works end to end.
