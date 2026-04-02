# PoB Codes

Monorepo implementation for a read-only Path of Building viewer for Path of Exile 1.

## Workspaces
- @pobcodes/web
- @pobcodes/worker
- @pobcodes/pob-codec
- @pobcodes/pob-parser
- @pobcodes/shared-types

## Commands
- npm install
- npm run typecheck
- npm run test
- npm run sync:data
- npm run verify:assets
- restart both dev servers: `.\restart-dev.cmd` (force-closes the prior worker/web dev windows first)
- restart both dev servers via npm: `npm.cmd run dev:restart`
- npm run dev:web
- npm run dev:worker

## Runbooks
- league and major patch refresh: [docs/league-update-runbook.md](docs/league-update-runbook.md)

## Plan Artifacts
See /codex-implementation for implementation handoff docs.
