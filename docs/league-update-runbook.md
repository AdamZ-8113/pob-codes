# League Update Runbook

## Purpose

This is the single runbook to use when Path of Exile ships a new league, expansion, or major patch and this repo needs a full data refresh.

Use this when you come back after a few months and need the shortest reliable path to:

- refresh passive tree data
- refresh self-hosted item, gem, and UI assets
- refresh PoB-derived metadata from the PoB source tree
- verify that the app still builds and tests cleanly

## Before You Start

### Environment

- run commands from the repo root
- on Windows PowerShell, prefer `npm.cmd` instead of `npm`
- make sure `git` is installed and on `PATH`

### Install dependencies

```powershell
npm.cmd install
```

### Optional local-only tooling

You only need this if you are refreshing Foulborn art:

- local Python venv: `.venv-foulborn`
- see [foulborn-upscaling.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/docs/foulborn-upscaling.md)

## Full League Refresh

Run this full sequence unless you are intentionally doing a partial refresh.

### 1. Refresh the local PoB mirror

This updates `local-pob-mirror/`, which the metadata generators read from.

```powershell
npm.cmd run update:local-pob-mirror
```

Useful sanity checks:

```powershell
git -C local-pob-mirror branch --show-current
git -C local-pob-mirror rev-parse HEAD
```

### 2. Refresh synced upstream data and runtime assets

This pulls fresh snapshots from:

- `grindinggear/skilltree-export`
- `repoe-fork/repoe`
- `repoe-fork/pob-data`
- `PathOfBuildingCommunity/PathOfBuilding`

```powershell
npm.cmd run sync:data
```

This step refreshes:

- passive tree JSON under `data/generated/skilltree/`
- `data/generated/source-meta.json`
- `data/generated/tree-manifest.json`
- `data/generated/item-icon-manifest.json`
- `data/generated/gem-icon-manifest.json`
- `apps/web/public/assets/passive-tree/default/*`
- `apps/web/public/assets/items/*`
- `apps/web/public/assets/gems/*`
- `apps/web/public/assets/ui/*`
- `apps/web/lib/generated/tree-manifest.ts`
- `apps/web/lib/generated/asset-manifest.ts`

### 3. Refresh official patch version names

This pulls the latest PoE1 major-version names from GGG's official developer changelog and regenerates the UI mapping used for labels like `3.28 Mirage`.

```powershell
npm.cmd run generate:patch-version-names
```

This step refreshes:

- `apps/web/lib/generated/patch-version-names.ts`

### 4. Regenerate PoB-source-derived metadata

These scripts read from `local-pob-mirror/` and are not covered by `sync:data`.

```powershell
node scripts/generate-pob-stat-layout.mjs
node scripts/generate-pob-config-options.mjs
node scripts/generate-pob-item-bases.mjs
node scripts/generate-pob-mod-order.mjs
node scripts/generate-passive-tree-cluster-data.mjs
node scripts/generate-passive-tree-timeless-keystones.mjs
node scripts/generate-gem-details.mjs
node scripts/generate-stat-descriptions.mjs
```

This step refreshes:

- `apps/web/lib/generated/pob-stat-layout.ts`
- `apps/web/lib/generated/pob-config-options.ts`
- `packages/pob-parser/src/generated/pob-item-bases.ts`
- `packages/pob-parser/src/generated/pob-mod-order.ts`
- `apps/web/lib/generated/passive-tree-cluster-data.ts`
- `apps/web/lib/generated/passive-tree-timeless-keystones.ts`
- `apps/web/lib/generated/gem-details.ts`
- `apps/web/lib/generated/stat-descriptions.ts`

### 5. Optional: refresh Foulborn art

Only do this if the league added or changed Foulborn-specific assets.

```powershell
# $env:POE_PUBLIC_STASH_ACCESS_TOKEN = "..."
# $env:POE_API_USER_AGENT = "OAuth your-client-id/1.0.0 (contact: you@example.com) PoBB Replacement"
node scripts/download-foulborn-art.mjs --start-id <next_change_id>

.\.venv-foulborn\Scripts\python.exe scripts\build-foulborn-upscaled-art.py
npm.cmd run sync:data
```

Notes:

- The downloader now uses only GGG's documented Public Stash API and downloads the same `web.poecdn.com` mutated icon URLs directly from `item.icon`.
- The unsupported trade-search API is intentionally not part of this workflow.
- Omit `--start-id` on the first run if you do not have a saved cursor yet.
- Coverage is limited to currently listed public items, so keep the printed `next_change_id` and re-run later when more Foulborn items appear in the stream.

Review outputs:

- `apps/web/public/assets/items/art/Foulborn/LowResolution/...`
- `apps/web/public/assets/items/art/Foulborn/Upscaled/...`
- `data/generated/foulborn-art-manifest.json`
- `data/generated/foulborn-upscale-inventory.json`
- `data/generated/foulborn-upscaled-art-manifest.json`
- local review strips in `tmp/upscaled_foulborn_comparison/...`

Detailed workflow:

- [foulborn-upscaling.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/docs/foulborn-upscaling.md)

## Verification

Run the verification sequence in this order.

### 1. Asset integrity

```powershell
npm.cmd run verify:assets
npm.cmd run verify:unique-art
```

What they cover:

- `verify:assets`
  - generated manifests exist
  - referenced passive tree assets exist
  - referenced item assets exist
  - referenced gem assets exist
  - `data/generated/source-meta.json` has source commit metadata
- `verify:unique-art`
  - current upstream unique item art resolves to a committed manifest path
  - referenced unique art files exist on disk
  - writes a report to `tmp/unique-art-coverage-report.json` when run

### 2. Full repo validation

On a clean checkout, run `build` before `typecheck` because `apps/web` expects generated `.next/types`.

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd run test
```

### 3. Focused tests worth checking when a league patch is large

```powershell
npm.cmd --workspace @pobcodes/worker test
npm.cmd --workspace @pobcodes/web test -- app/b/[id]/page.test.tsx
npm.cmd --workspace @pobcodes/web test -- components/passive-tree-panel.test.tsx
npm.cmd --workspace @pobcodes/pob-parser test -- src/item-parser.test.ts
```

These are the highest-signal targeted checks when the update touches:

- worker import and build upload/retrieval
- passive tree layout and loading
- parser item handling
- build page rendering

## Manual Smoke Test

After the automated checks pass:

```powershell
npm.cmd run dev:restart
```

Then verify manually:

1. the homepage loads
2. a sample build uploads successfully
3. `/b/<id>` renders correctly
4. passive tree assets load and draw correctly
5. item icons and gem icons resolve correctly
6. one known unique item with special art still renders correctly
7. one imported URL from a supported source still resolves correctly

Supported import sources are documented in:

- [data_pipeline.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/data_pipeline.md)

## Script Reference

### Sync and source refresh

| Command | Purpose | Main outputs |
|---|---|---|
| `npm.cmd run update:local-pob-mirror` | refresh local PoB source checkout | `local-pob-mirror/*` |
| `npm.cmd run sync:data` | refresh upstream tree, item, gem, and UI assets plus generated manifests | `data/generated/*`, `apps/web/public/assets/*`, `apps/web/lib/generated/tree-manifest.ts`, `apps/web/lib/generated/asset-manifest.ts` |
| `npm.cmd run generate:patch-version-names` | refresh official league and patch display names from GGG developer docs | `apps/web/lib/generated/patch-version-names.ts` |

### PoB-source metadata generators

| Command | Purpose | Main outputs |
|---|---|---|
| `node scripts/generate-pob-stat-layout.mjs` | stat layout and labels from PoB | `apps/web/lib/generated/pob-stat-layout.ts` |
| `node scripts/generate-pob-config-options.mjs` | config labels, sections, defaults, choices | `apps/web/lib/generated/pob-config-options.ts` |
| `node scripts/generate-pob-item-bases.mjs` | PoB item base metadata for parser | `packages/pob-parser/src/generated/pob-item-bases.ts` |
| `node scripts/generate-pob-mod-order.mjs` | explicit mod sort order | `packages/pob-parser/src/generated/pob-mod-order.ts` |
| `node scripts/generate-passive-tree-cluster-data.mjs` | cluster jewel structure and tree-derived node data | `apps/web/lib/generated/passive-tree-cluster-data.ts` |
| `node scripts/generate-passive-tree-timeless-keystones.mjs` | timeless jewel keystone metadata | `apps/web/lib/generated/passive-tree-timeless-keystones.ts` |
| `node scripts/generate-gem-details.mjs` | detailed gem metadata from PoB source | `apps/web/lib/generated/gem-details.ts` |
| `node scripts/generate-stat-descriptions.mjs` | stat key to display-template mapping | `apps/web/lib/generated/stat-descriptions.ts` |

### Asset verification and optional art workflows

| Command | Purpose | Main outputs |
|---|---|---|
| `npm.cmd run verify:assets` | validate generated manifests and referenced files | console output only |
| `npm.cmd run verify:unique-art` | validate unique art coverage against upstream | `tmp/unique-art-coverage-report.json` |
| `node scripts/download-foulborn-art.mjs --start-id <next_change_id>` | refresh low-resolution Foulborn assets from GGG's Public Stash API | `apps/web/public/assets/items/art/Foulborn/LowResolution/*`, console `next_change_id` |
| `.\.venv-foulborn\Scripts\python.exe scripts\build-foulborn-upscaled-art.py` | build upscaled Foulborn assets | `apps/web/public/assets/items/art/Foulborn/Upscaled/*`, `data/generated/foulborn-upscale-inventory.json` |

## Optional Automation

This repo also includes a scheduled GitHub workflow:

- `.github/workflows/update-patch-version-names.yml`

It reruns `npm run generate:patch-version-names` every Monday and opens a PR if GGG has published a new PoE1 major patch name in the official changelog.

Before relying on it, make sure the GitHub repo allows Actions to create pull requests.

## Partial Refresh Rules

If you only need one part of the stack, use these shortcuts:

### Passive tree, item art, gem art, slot icons, UI icons

Run:

```powershell
npm.cmd run sync:data
npm.cmd run verify:assets
```

### PoB labels, config options, gem metadata, stat descriptions, parser metadata

Run:

```powershell
npm.cmd run update:local-pob-mirror
node scripts/generate-pob-stat-layout.mjs
node scripts/generate-pob-config-options.mjs
node scripts/generate-pob-item-bases.mjs
node scripts/generate-pob-mod-order.mjs
node scripts/generate-passive-tree-cluster-data.mjs
node scripts/generate-passive-tree-timeless-keystones.mjs
node scripts/generate-gem-details.mjs
node scripts/generate-stat-descriptions.mjs
npm.cmd run generate:patch-version-names
```

If you use this partial route, still finish with:

```powershell
npm.cmd run build
npm.cmd run typecheck
npm.cmd run test
```

## What To Review Before Committing

At minimum, inspect changes in:

- `data/generated/source-meta.json`
- `data/generated/skilltree/*`
- `data/generated/tree-manifest.json`
- `data/generated/item-icon-manifest.json`
- `data/generated/gem-icon-manifest.json`
- `apps/web/public/assets/passive-tree/default/*`
- `apps/web/public/assets/items/*`
- `apps/web/public/assets/gems/*`
- `apps/web/public/assets/ui/*`
- `apps/web/lib/generated/*`
- `packages/pob-parser/src/generated/*`

Also record the local PoB mirror commit you used:

```powershell
git -C local-pob-mirror rev-parse HEAD
```

## Detailed References

Use these when you need more context than this checklist provides:

- [data_pipeline.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/data_pipeline.md)
- [foulborn-upscaling.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/docs/foulborn-upscaling.md)
- [README.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/README.md)
