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
- npm run build
- npm run typecheck
- npm run test
- npm run verify
- npm run sync:data
- npm run verify:assets
- npm run verify:unique-art
- npm run generate:patch-version-names
- restart both dev servers: `.\restart-dev.cmd` (force-closes the prior worker/web dev windows first)
- restart both dev servers via npm: `npm.cmd run dev:restart`
- npm run dev:web
- npm run dev:worker
- npm run preview:web
- npm run deploy (requires Cloudflare auth plus worker KV env vars)

## Repo Files
- `LICENSE`: MIT license for this repository
- `NOTICE.md`: trademark and upstream attribution notice
- `data_pipeline.md`: source-of-truth description for synced data and asset inputs
- `docs/deployment-runbook.md`: deployment and production operations
- `docs/league-update-runbook.md`: league refresh and regeneration workflow
- `docs/foulborn-upscaling.md`: Foulborn art workflow details

## Legal
PoB Codes is an unofficial fan-made Path of Exile tool. Path of Exile, Path of Exile 2, and related names and assets are owned by Grinding Gear Games. See `NOTICE.md` for attribution and disclaimer details, and `LICENSE` for the repository license.
