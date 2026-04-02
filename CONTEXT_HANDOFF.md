# Context Handoff

This document is intended to let a fresh Codex session continue the current build-caching work without re-discovering context.

## Current focus

The current optimization work is on build payload caching for the Cloudflare worker that powers uploaded PoB builds.

What is already done:

- raw PoB codes are now stored under `raw:{id}` instead of only the legacy unprefixed key
- parsed `BuildPayload` JSON is now cached in KV under `payload:{cacheVersion}:{id}`
- successful uploads warm both the raw-code store and parsed-payload cache
- `GET /:id/json` now serves cached payload JSON first and only reparses on cache miss
- legacy unprefixed raw build keys still work for backward compatibility
- successful `GET /:id/json` responses are now also cached in the Worker edge cache with a versioned cache key
- the passive tree panel now defers loading `layout-default.json` and `sprite-manifest.json` until the panel is near the viewport
- Foulborn item icons no longer wait on runtime `HEAD`/`GET` availability probes before rendering
- unique item icon lookup now has a normalized-name fallback for diacritic/punctuation variants like `Doppelgänger Guise` vs `Doppelganger's Guise`
- full unique-art coverage can now be checked with `npm run verify:unique-art`, which compares upstream unique names and `dds_file` paths against the generated manifest and on-disk assets
- the build comparison modal now has an `Items` finding, item-specific highlight styling, and unique/item variant displays include labeled `Synthesized and Corrupted Implicits` sections plus corruption flags
- the build title in `BuildViewer` now renders as `Primary Skill / Ascendancy (Base Class) / Secondary Ascendancy`, with the primary skill resolved from the selected active PoB skill set and main active gem
- passive tree jewel sockets can now render circular radius overlays for known radius jewels, using structured `item.jewelRadius` data with a raw-text fallback for older cached payloads
- stat label selection now mirrors PoB's `skipEffectiveRate` behavior for support-triggered skills like `Automation`, `Autoexertion`, `Call to Arms`, and `Spellslinger`
- `pob-stat-layout` now also uses the same non-support main-gem selection strategy as the title resolver, so support-indexed `mainActiveSkill` exports still resolve spell/attack flags correctly and avoid bogus `Effective Trigger Rate` labels

## Important current paths

Worker implementation:

- `apps/worker/src/index.ts`
- `apps/worker/src/import-resolver.ts`

Regression tests:

- `apps/worker/src/index.test.ts`

Benchmarking:

- `scripts/benchmark-worker-payload-cache.ts`

Related web fetch path:

- `apps/web/lib/fetch-build.ts`
- `apps/web/app/b/[id]/page.tsx`
- `apps/web/components/passive-tree-panel.tsx`
- `apps/web/components/passive-tree-panel.test.tsx`
- `apps/web/lib/icon-paths.ts`
- `apps/web/lib/icon-paths.test.ts`
- `apps/web/lib/build-compare.ts`
- `apps/web/lib/build-compare.test.ts`
- `apps/web/components/items-panel.tsx`
- `apps/web/components/items-panel.test.tsx`
- `apps/web/components/compare-build-modal.tsx`
- `apps/web/components/compare-build-modal.test.tsx`
- `apps/web/components/build-viewer.tsx`
- `apps/web/components/build-viewer.test.ts`
- `apps/web/lib/passive-tree.ts`
- `apps/web/lib/pob-stat-layout.ts`
- `apps/web/lib/pob-stat-layout.test.ts`
- `scripts/sync-data.mjs`
- `scripts/verify-unique-art-coverage.mjs`
- `packages/pob-parser/src/item-parser.ts`
- `packages/pob-parser/src/item-parser.test.ts`
- `packages/shared-types/src/index.ts`

## Current behavior

Storage layout:

1. canonical raw PoB source: `raw:{id}`
2. derived parsed payload cache: `payload:{cacheVersion}:{id}`
3. legacy fallback read: `{id}` for older builds already stored before namespacing

Caching layers:

1. KV parsed-payload cache
2. Worker edge cache for successful `/:id/json` responses

Frontend loading behavior:

1. passive tree assets are no longer fetched immediately on page mount when `IntersectionObserver` is available
2. the panel activates its tree asset loading when it enters a generous prefetch margin near the viewport
3. browsers/tests without `IntersectionObserver` still fall back to immediate loading so behavior remains compatible
4. synced Foulborn icons now resolve synchronously from generated low-resolution and upscaled manifests, then fall back via normal `img` error handling if an asset is unexpectedly missing

Important implementation details:

- parsed payload cache versioning is for parser/data evolution, not build identity
- raw PoB code remains the source of truth
- parsed payload cache is disposable and controlled by TTL
- edge cache keys also include the parsed payload cache version so parser/version bumps do not serve stale JSON forever
- passive jewel radius overlays currently use PoB's `3_16+` outer-radius values: `Small 960`, `Medium 1440`, `Large 1800`, `Very Large 2400`, `Massive 2880`
- the current UI intentionally draws only circular overlays, not Thread-of-Hope-style annuli

Current environment knobs:

- `PARSED_PAYLOAD_CACHE_ENABLED`
- `PARSED_PAYLOAD_CACHE_VERSION`
- `PARSED_PAYLOAD_TTL_SECONDS`
- `JSON_RESPONSE_EDGE_CACHE_ENABLED`

## Current verification state

Validated commands:

- `npm.cmd --workspace @pobcodes/worker test`
- `npm.cmd --workspace @pobcodes/worker run typecheck`
- `npx.cmd tsx scripts/benchmark-worker-payload-cache.ts --limit 1`
- `npm.cmd --workspace @pobcodes/web test -- components/passive-tree-panel.test.tsx`
- `npm.cmd --workspace @pobcodes/web test -- app/b/[id]/page.test.tsx`
- `npm.cmd --workspace @pobcodes/web run typecheck`
- `npm.cmd --workspace @pobcodes/pob-parser test -- src/item-parser.test.ts`
- `npm.cmd --workspace @pobcodes/pob-parser run typecheck`

The local benchmark confirmed the core expected shape:

- cache-enabled warm `GET /:id/json` is materially faster than reparsing on every request
- cache hits return precomputed JSON without invoking the parser again

## Immediate next step for a fresh session

If continuing this work, start by reading:

1. `apps/worker/src/index.ts`
2. `apps/worker/src/index.test.ts`
3. `scripts/benchmark-worker-payload-cache.ts`

The next likely tasks are:

1. evaluate whether the web fetch layer in `apps/web/lib/fetch-build.ts` should adopt a stronger immutable caching strategy without freezing not-found responses
2. consider a Service Binding between the web app and worker to remove the public HTTP hop
3. add production-facing observability for cache-hit rates if needed
4. consider splitting the passive tree bundle itself if the remaining JS parse cost is still noticeable
