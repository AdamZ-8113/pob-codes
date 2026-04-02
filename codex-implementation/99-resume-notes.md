# Resume Notes (Paused)

## Updated Checkpoint (2026-03-09)
- Resumed and validated current code after the paused patch set.
- `npm run sync:data`, `npm run verify:assets`, `npm run typecheck`, `npm run test`, and `npm run build` all pass.
- Added UI styling for new items/gems rendering classes.
- Replaced the passive tree placeholder with a real SVG renderer:
  - multi-spec selection
  - generated variant matching (`default`, `alternate`, `ruthless`, `ruthlessAlternate`)
  - allocated link rendering
  - drag-pan / zoom / focus controls
  - hover tooltip detail
- Upgraded passive tree nodes from generic markers to atlas-backed sprite rendering using synced passive tree art.
- Reworked passive tree navigation for responsiveness:
  - drag-pan no longer updates React state on every pointer move
  - scene transforms are applied imperatively via `requestAnimationFrame`
  - added mouse-wheel zoom and `Fit Build` / `Fit Tree` controls
  - widened zoom range for real inspection
- Compared the renderer against upstream `PathOfBuilding` passive-tree code and aligned more of the web viewer to that model:
  - exact PoB orbit-angle tables for 16-node and 40-node rings
  - PoB-style connector routing: orbit arcs plus straight connectors elsewhere
  - synced and rendered passive-tree group background art from the atlas sheets
  - added asset-backed class-start and frame rendering using the synced passive-tree atlases
- Removed the old heavy/full passive-tree mode from the UI and runtime path.
  - the tree viewer now always uses the simplified fast SVG renderer
  - removed the mode toggle and localStorage mode persistence
  - stopped fetching the passive-tree sprite manifest in the build viewer
- Added route-level web integration coverage for `/b/:id`.
  - success case renders the real page tree with mocked build payload + passive-tree layout fetch
  - failure case renders the route error box when build fetch fails
  - added reusable test fixtures under `apps/web/test/fixtures`
  - added `apps/web/vitest.config.ts` for automatic JSX transform in tests
- Added item-set and skill-set switching in the build viewer.
  - viewer now honors exported `activeItemSetId` / `activeSkillSetId` as the initial selection
  - item and skill panels expose selectors when multiple sets are present
  - route test fixture now exercises switching between multiple sets
- Added shared viewer selection state across item sets, skill sets, and tree specs.
  - changing an item set now drives linked skill-set and tree-spec selection by title/index heuristics
  - changing a skill set or tree spec uses the same linking model
  - the build page now uses a dedicated client `BuildViewer` wrapper for that shared state
- Reworked the left stats column to preserve PoB export order instead of rendering unordered object maps.
  - parser now preserves ordered `playerRows` / `minionRows` from XML alongside the legacy lookup maps
  - added generated PoB stat-layout metadata from upstream `BuildDisplayStats.lua`
  - stat rendering now follows PoB block separation and hides helper-only exported rows such as overcap entries
  - removed viewer-invented context rows from the left column so displayed rows come from exported XML only
- Tightened the left stats column to match PoB display behavior more closely while using less width.
  - zero-valued rows are hidden
  - redundant poison/DoT total rows are suppressed with PoB-style visibility rules
  - attribute requirements are merged into the main attribute row (for example `Strength: 202 (180 required)`)
  - overcap values now render as suffixes on block/resistance rows (for example `75% (+28%)`)
  - stat values now use PoB-aware formatting metadata (`fmt`) from upstream `BuildDisplayStats.lua`
  - the left column width and row spacing were reduced to reclaim more space for the tree
- Fixed additional PoB stat-display mismatches from real sample data.
  - upstream `pc = true` is now honored, so rows like `Crit Multiplier` display `5.2` as `520%`
  - decimal stat formatting now uses grouped thousands separators like PoB
  - `Average Burst Damage` is now hidden unless PoB's `AverageBurstHits > 1` condition is satisfied
- Added a one-off item-art proof of concept for the current `pob-test.txt` sample.
  - captured the real `Aegis Aurora` inventory icon into `apps/web/public/assets/items/uniques/aegis-aurora.png`
  - item icon resolution now has a targeted unique-name override for `Aegis Aurora`
  - item icons now use `object-fit: contain` so real inventory art is not cropped as aggressively in the fixed slot
- Replaced the one-off unique override with a generated full item-art pipeline.
  - `sync:data` now fetches RePoE `base_items.min.json` and `uniques.min.json`
  - item art paths are derived from `visual_identity.dds_file`
  - runtime PNGs are self-hosted under `apps/web/public/assets/items/art/*`
  - generated manifest now exposes `items.byUniqueName` and `items.byBaseName`
  - runtime resolution now uses `unique -> base -> slot fallback`
  - the last sync resolved `3717` distinct art files, `3723` base-name entries, and `1297` unique-name entries
- Added tree-spec metadata display in the passive tree panel.
  - shows current spec title
  - shows exported tree URL when present
- Expanded build viewer layout to use the browser width instead of a narrow centered column.
- Added exported value formatting so stat/config numbers do not show noisy long decimal tails.
- Extended asset sync to generate compact passive tree layout JSON files and a dedicated generated tree manifest:
  - `apps/web/public/assets/passive-tree/default/layout-*.json`
  - `apps/web/public/assets/passive-tree/default/sprite-manifest.json`
  - `apps/web/lib/generated/tree-manifest.ts`
  - enriched `data/generated/tree-manifest.json`
- Added passive tree helper tests for variant selection, links, tooltip mapping, viewport focus, and sprite resolution.
- Added Notes & Config panel to the build page.
- Added `npm run sync:data` and `npm run verify:assets`.
- Added generated metadata + public asset pipeline:
  - `data/generated/*.json`
  - `apps/web/public/assets/*`
  - `apps/web/lib/generated/asset-manifest.ts`
- Replaced slug-only icon guessing with manifest-backed item/gem/influence asset lookup.
- Added web tests for icon resolution.

## Last Completed Checkpoint
- Monorepo scaffold, plan docs, parser/codec/worker/web app structure are in place.
- `npm run typecheck`, `npm run test`, and `npm run build` were all passing **before** the latest UI/parser/worker enhancement patch set.

## Current State
- Local testing is usable with the worker and web dev servers running.
- Runtime scope is now explicitly PoE1-only.
- Item/gem icon resolution is manifest-backed and self-hosted.
- Item art is now sourced from a generated full manifest instead of slot-only placeholders for most items.
- Passive tree rendering now works for synced PoE1 tree variants and is materially closer to PoB Codes art/layout.
- The viewer now ships only the simplified passive-tree mode in the web app.
- Build viewer selection is now synchronized across items, skills, tree, and stats context.
- Left-column stat rendering now mirrors PoB export row order and block grouping more closely.

## Next Steps to Resume
1. Manually verify the passive tree UI in the browser:
   - `/` upload flow
   - `/b/:id` build viewer
   - drag-pan / wheel-zoom / fit controls / tooltip behavior on a real build
2. Continue feature completeness around imported build context:
   - refine item-set/skill-set/tree linking heuristics on real PoB exports
   - surface any additional exported per-spec metadata that helps navigation
   - decide whether more context panels should react to active set selection
3. Add broader integration coverage:
   - more PoE1 build fixtures
   - expand web integration coverage beyond the current `/b/:id` success/error path

- Implemented real gem-art manifest generation from RePoE + pob-data. uildGemManifest() now maps PoB gem ids, game ids, granted effect ids, and variant ids to self-hosted PNGs under /assets/items/art/Gems, with SVG placeholders kept only as fallback.

- Fixed item base parsing and icon resolution for non-unique gear. parseRawItem() now trims indented XML lines correctly and ignores separator lines, so rares resolve their real base types. esolveItemIconPath() now infers magic-item base names from the generated base manifest, which makes magic flasks resolve to real flask art instead of slot fallbacks.

- Reworked the build-page layout to a 2-column view: left stats, right main content. Gear now renders above the passive tree in an in-game-style board, the old right-hand item column is gone, and item mods are shown only in hover tooltips instead of inline cards.
