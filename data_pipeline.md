# Data Pipeline

This document describes where the project's data and visual assets come from, how they are refreshed, what is stored in generated snapshots, and what is parsed directly from imported Path of Building exports at runtime.

## Overview

This project does not rely on a single source.

There are two broad inputs:

1. Imported build content
2. Synced metadata and self-hosted runtime assets

Imported build content comes from PoB exports or PoB-compatible links at request time.

Synced metadata and assets are generated ahead of time by `npm run sync:data` and committed into the repo.

## Source Inventory

### Runtime build input sources

These are used by the worker to resolve build links into a PoB code string:

- `pobb.in`
- `poe.ninja`
- `maxroll.gg`
- `pastebin.com`
- `poedb.tw`

Resolver implementation:

- `apps/worker/src/import-resolver.ts`

### Synced upstream sources

These are cloned or fetched by the sync pipeline:

- `https://github.com/grindinggear/skilltree-export`
- `https://github.com/repoe-fork/repoe`
- `https://github.com/repoe-fork/pob-data`
- `https://github.com/PathOfBuildingCommunity/PathOfBuilding`

Current synced commits are recorded in:

- `data/generated/source-meta.json`

## What Each Source Supplies

### 1. Imported PoB content

Parsed from the PoB export itself:

- build section
- tree allocations and sockets
- item sets and raw item text
- skill sets and gem levels/quality
- config values
- exported stat rows such as `PlayerStat`, `MinionStat`, and `FullDPSSkill`
- notes

Parser entry points:

- `packages/pob-parser/src/index.ts`
- `packages/pob-parser/src/item-parser.ts`

Important limitation:

- the full PoB `Calcs` tab is not serialized into the build code
- PoB exports a flattened subset of computed values, not the entire breakdown UI

### 2. `grindinggear/skilltree-export`

Used for passive tree layout and sprite assets:

- `data.json`
- alternate tree layouts
- tree sprite atlases
- passive tree asset files copied into web public assets

Sync code:

- `scripts/sync-data.mjs`

Generated outputs:

- `data/generated/skilltree/*.json`
- `data/generated/tree-manifest.json`
- `apps/web/public/assets/passive-tree/default/*`

### 3. `repoe-fork/repoe`

Used for game metadata and art path discovery.

Current published data host used by the sync pipeline:

- `https://repoe-fork.github.io`

Used for:

- `base_items.min.json`
- `uniques.min.json`
- `gems.min.json`
- item and gem `visual_identity.dds_file` values
- fallback PNG downloads for item art

Examples:

- base item art lookup
- unique item art lookup
- gem base-item art lookup

Sync code:

- `scripts/sync-data.mjs`

### 4. `repoe-fork/pob-data`

Used for PoB-oriented mappings that RePoE alone does not provide in the format we need.

Used for:

- PoB base names and types from `pob-data/poe1/Bases/*.json`
- PoB gem table from `pob-data/poe1/Gems.json`
- gem lookup ids and variants used by PoB

Sync code:

- `scripts/sync-data.mjs`

### 5. `PathOfBuildingCommunity/PathOfBuilding`

Used in two different ways.

First, the sync pipeline clones the live repo to copy UI assets:

- slot icons
- influence icons

Second, this repo also keeps a local PoB mirror in `local-pob-mirror` for generated metadata extraction.

That local mirror is used to generate:

- stat layout metadata
- config option metadata
- item base metadata
- explicit mod ordering
- cluster jewel metadata
- gem details
- stat descriptions

Generator scripts:

- `scripts/generate-pob-stat-layout.mjs`
- `scripts/generate-pob-config-options.mjs`
- `scripts/generate-pob-item-bases.mjs`
- `scripts/generate-pob-mod-order.mjs`
- `scripts/generate-passive-tree-cluster-data.mjs`
- `scripts/generate-gem-details.mjs`
- `scripts/generate-stat-descriptions.mjs`

## `local-pob-mirror`

`local-pob-mirror` is a local checked-out copy of the Path of Building Community repository that exists specifically so this repo can read PoB source files directly when generating metadata.

It is not the same thing as the temporary fresh clone used by `scripts/sync-data.mjs`.

### What it is

- a local git checkout under `local-pob-mirror/`
- its remote points at `https://github.com/PathOfBuildingCommunity/PathOfBuilding`
- it tracks the PoB `dev` branch

### What it is used for

It is used as the source of truth for PoB-specific presentation and metadata that is easier to extract from PoB's Lua source than from RePoE or pob-data.

Examples:

- sidebar stat labels and formatting
- config option labels, grouping, and defaults
- explicit mod ordering
- PoB item base metadata
- cluster jewel metadata
- gem metadata
- stat descriptions

In other words, `local-pob-mirror` is mainly for generating PoB-derived metadata, not for serving runtime art files directly.

It is a development dependency, not a disposable temp folder.

### How it is updated

This checkout now has an explicit refresh script:

- `npm run update:local-pob-mirror`
- `scripts/update-local-pob-mirror.mjs`

That means:

- `npm run sync:data` does **not** update it
- it is refreshed intentionally when we decide to pull in newer PoB-source-derived metadata
- it can drift from the newer PoB commit used elsewhere in the sync pipeline

### Why this matters

The sync pipeline clones a fresh PoB repo in a temp directory for UI assets and records that commit in `data/generated/source-meta.json`.

The generator scripts listed above read from `local-pob-mirror` instead.

So it is possible for:

- slot icons and influence icons to come from a newer PoB revision
- while stat/config/mod-order metadata still comes from an older `local-pob-mirror` snapshot

If PoB-specific labels or behavior look stale while synced assets are current, `local-pob-mirror` is one of the first places to check.

### How to inspect it

Useful commands:

- `git -C local-pob-mirror remote -v`
- `git -C local-pob-mirror branch --show-current`
- `git -C local-pob-mirror rev-parse HEAD`
- `git -C local-pob-mirror fetch origin dev`
- `git -C local-pob-mirror rev-parse origin/dev`

### Recommended future improvement

If this repo continues to rely on PoB-derived metadata generation, we should eventually make the refresh process explicit.

Good options would be:

- extend `update:local-pob-mirror` to pin to a chosen PoB commit and regenerate dependent outputs
- or stop using a persistent checkout and generate everything from the same fresh PoB clone used by `sync:data`

## Asset Download and Hosting Model

The project self-hosts runtime assets under:

- `apps/web/public/assets/passive-tree/*`
- `apps/web/public/assets/items/*`
- `apps/web/public/assets/gems/*`
- `apps/web/public/assets/ui/*`

Item art download flow:

1. Read `visual_identity.dds_file` from RePoE published JSON
2. Convert `.dds` path to `.png`
3. Try downloading from the PoE CDN first
4. Fall back to the RePoE published host
5. Save into `apps/web/public/assets/items/art/*`
6. Record the resulting public path in generated manifests

This logic lives in:

- `scripts/sync-data.mjs`

## Generated Outputs

The sync pipeline writes:

- `data/generated/source-meta.json`
- `data/generated/tree-manifest.json`
- `data/generated/item-icon-manifest.json`
- `data/generated/gem-icon-manifest.json`
- `data/generated/skilltree/*.json`

It also writes generated runtime modules under:

- `apps/web/lib/generated/*`

These generated modules are consumed by the web app at runtime to avoid querying upstream services directly.

## Verification

Commands:

- `npm run sync:data`
- `npm run verify:assets`
- `npm run typecheck`

Asset verification checks:

- generated manifest files exist
- referenced item assets exist
- referenced gem assets exist
- passive tree assets exist
- source metadata contains commit hashes and source URLs

Verification script:

- `scripts/verify-assets.mjs`

## Current Important Notes

### RePoE source host

The sync pipeline should use the `repoe-fork` published host:

- `https://repoe-fork.github.io`

This matters because newer items and art can be missing from the older deprecated RePoE mirror.

### Manual overrides

The codebase still contains a small number of local fallbacks and overrides for edge cases where synced upstream data may be incomplete or where local UI-specific behavior is needed.

Those should be treated as exceptions, not the primary source of truth.

### Imported PoB data vs site-enriched data

If a property is missing from the imported PoB code, the app usually cannot reconstruct it unless a separate enrichment path exists.

Example:

- jewelry catalyst quality may exist on `poe.ninja` character item JSON
- the same value may be absent from the exported PoB code
- in that case PoB and this app will both miss it unless we explicitly enrich imports from the richer source

## Recommended Mental Model

Use this split when reasoning about bugs:

- If the problem is about a specific imported build value, check the PoB export first
- If the problem is about icons, art, tree layout, gem art, or static metadata, check the sync pipeline and generated assets
- If the problem is about tooltip ordering, stat labels, config labeling, or other PoB-specific presentation logic, check the generated metadata derived from `local-pob-mirror`

## Key Files

- `scripts/sync-data.mjs`
- `scripts/verify-assets.mjs`
- `data/generated/source-meta.json`
- `packages/pob-parser/src/index.ts`
- `packages/pob-parser/src/item-parser.ts`
- `apps/worker/src/import-resolver.ts`
- `apps/web/lib/generated/*`
- `local-pob-mirror/*`
