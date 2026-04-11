# Refactoring Plan

> Generated 2026-04-05 | Focused on AI readability, iteration speed, and end-user performance

---

## Project 1: Unify Build Comparison Shared Code

**Priority:** HIGH | **Effort:** 3-4 hours | **Impact:** ~1,800 lines removed

### Problem
There are two build comparison engines:
- `build-compare-stable.ts` (1,377 lines)
- `build-compare-v2.ts` (2,924 lines)

Both define **identical interfaces**, **identical constants**, and **duplicated utility functions**:
- Interfaces: `BuildCompareRow`, `BuildCompareFinding`, `BuildCompareReport`, `ComparedGem`, `ComparedGemCollections`, `ComparedConfigRow`, `ComparedCountedTreeValue`
- Constants: `GEM_DETAILS_BY_NAME`, `GEM_DETAILS_BY_EFFECT_ID` (initialized the same way in both)
- Utilities: `normalizeGemCompareName()`, text normalization helpers

A third file `build-compare.ts` acts as a strategy selector between the two — that part is well-designed.

### Why it matters
- **AI readability:** An AI agent reading one file sees interfaces/functions that look identical to another file, wasting context window and creating confusion about which is canonical.
- **Iteration risk:** Changing `BuildCompareRow` requires editing two files. If one is missed, the engines silently diverge.
- **Code size:** ~1,800 lines of pure duplication.

### Plan
1. Create `build-compare-shared.ts` containing:
   - All shared interfaces (`BuildCompareRow`, `BuildCompareFinding`, `BuildCompareReport`, etc.)
   - Shared constants (`GEM_DETAILS_BY_NAME`, `GEM_DETAILS_BY_EFFECT_ID`)
   - Shared utility functions (`normalizeGemCompareName`, etc.)
2. Update `build-compare-stable.ts` to import from shared
3. Update `build-compare-v2.ts` to import from shared
4. Update `build-compare.ts` (strategy selector) to re-export shared types
5. Update all test files and consumers

### Files affected
- Create: `apps/web/lib/build-compare-shared.ts`
- Modify: `apps/web/lib/build-compare-stable.ts`
- Modify: `apps/web/lib/build-compare-v2.ts`
- Modify: `apps/web/lib/build-compare.ts`
- Modify: `apps/web/lib/build-compare-v2.test.ts`
- Modify: `apps/web/lib/build-compare.test.ts`
- Modify: `apps/web/components/compare-build-modal.tsx`
- Modify: `apps/web/components/compare-build-modal.test.tsx`

---

## Project 2: Extract `useResponsiveLayout` Hook

**Priority:** HIGH | **Effort:** 1-2 hours | **Impact:** Eliminates repeated pattern, single source of truth

### Problem
The same media query detection pattern is copy-pasted across multiple components:

```typescript
// Appears in build-viewer.tsx (~30 lines) and skills-panel.tsx (~30 lines)
const narrowViewport = window.matchMedia("(max-width: 1180px)");
const coarsePointer = window.matchMedia("(pointer: coarse)");
const noHover = window.matchMedia("(hover: none)");
const updateLayoutMode = () => {
  const userAgent = window.navigator.userAgent;
  const looksMobile = coarsePointer.matches || noHover.matches || ...
  setUseMobileStatsPlacement(narrowViewport.matches && looksMobile);
};
// + event listeners, cleanup, etc.
```

### Why it matters
- **Iteration risk:** Changing mobile breakpoints or detection logic requires finding and updating every copy.
- **AI readability:** An AI agent sees two identical-looking effects and can't tell if the differences are intentional.
- **Consistency:** Guarantees all components agree on what "mobile" means.

### Plan
1. Create `apps/web/lib/use-responsive-layout.ts`:
   ```typescript
   export function useResponsiveLayout() {
     // Consolidated media query logic
     return { isMobile: boolean, isNarrow: boolean, isTouch: boolean };
   }
   ```
2. Replace duplicated code in `build-viewer.tsx` with hook call
3. Replace duplicated code in `skills-panel.tsx` with hook call
4. Write test for the hook (mock `matchMedia`)

### Files affected
- Create: `apps/web/lib/use-responsive-layout.ts`
- Modify: `apps/web/components/build-viewer.tsx`
- Modify: `apps/web/components/skills-panel.tsx`

---

## Project 3: Extract Items Panel Helpers

**Priority:** MEDIUM | **Effort:** 1.5 hours | **Impact:** 1,352-line file becomes two focused files

### Problem
`items-panel.tsx` (1,352 lines) has ~300 lines of pure helper functions (lines 12-320) before the React component even begins. These helpers handle:
- Item tooltip section building
- Mod formatting and categorization
- Socket string parsing
- Influence icon resolution
- Rarity color mapping

None of these depend on React or component state.

### Why it matters
- **AI readability:** An agent asked to modify the ItemsPanel component must load 1,352 lines. Most of the first 300 are irrelevant to component behavior.
- **Testability:** Helpers extracted to their own file can be unit-tested independently without jsdom/React Testing Library overhead.
- **Iteration speed:** Changes to tooltip formatting don't require loading the component file.

### Plan
1. Create `apps/web/lib/items-panel-helpers.ts`
2. Move all pure helper functions (tooltip builders, mod formatters, socket parsers, etc.)
3. Keep only the React component and its direct UI logic in `items-panel.tsx`
4. Update imports

### Files affected
- Create: `apps/web/lib/items-panel-helpers.ts`
- Modify: `apps/web/components/items-panel.tsx`
- Modify: `apps/web/components/items-panel.test.tsx` (update imports if needed)

---

## Project 4: Break Up Passive Tree Panel

**Priority:** MEDIUM | **Effort:** 4-5 hours | **Impact:** 1,453-line component becomes manageable pieces

### Problem
`passive-tree-panel.tsx` (1,453 lines) is the largest component in the codebase. It mixes:
- **Viewport mathematics** (coordinate transforms, zoom calculations, bounds checking)
- **Pointer/gesture handling** (pan, pinch-zoom, pointer capture, momentum scrolling)
- **Asset loading** (fetching tree layout JSON, sprite images)
- **SVG rendering** (node circles, links, sprites, hover tooltips)
- **React state management** (12 state variables, 10+ refs, 5 useMemos)

### Why it matters
- **AI readability:** This is the hardest file in the codebase for an AI to reason about. The math, events, and rendering are interleaved.
- **Bug isolation:** A bug in zoom behavior requires understanding the entire 1,453-line file to debug.
- **Testability:** Viewport math is pure logic that should be testable without React/DOM, but currently it's trapped inside useCallback closures.

### Plan
1. Create `apps/web/lib/passive-tree-viewport.ts`:
   - Pure functions: coordinate transforms, zoom level clamping, bounds calculation, viewport rect computation
   - No React dependencies
   - Easily unit-testable
2. Create `apps/web/lib/use-passive-tree-viewport.ts`:
   - Custom hook wrapping viewport state + pointer handlers
   - Consumes pure functions from above
   - Manages refs for pointer tracking, momentum
3. Slim down `passive-tree-panel.tsx`:
   - Uses the viewport hook
   - Focuses on SVG rendering and layout
   - Target: ~500-600 lines

### Files affected
- Create: `apps/web/lib/passive-tree-viewport.ts`
- Create: `apps/web/lib/use-passive-tree-viewport.ts`
- Modify: `apps/web/components/passive-tree-panel.tsx`
- Modify: `apps/web/components/passive-tree-panel.test.tsx`

---

## Project 5: Evaluate Consolidating or Deprecating the Stable Comparison Engine

**Priority:** MEDIUM-LOW | **Effort:** 2-3 hours (investigation) | **Impact:** Potentially halves comparison code

### Problem
There are two full comparison engines:
- `build-compare-stable.ts` — the original
- `build-compare-v2.ts` — a newer, more detailed engine

Both are actively selectable in the UI via `build-compare.ts` strategy pattern.

### Why it matters
- **Maintenance cost:** Every new comparison feature must be implemented in both engines or one falls behind.
- **AI readability:** Two engines doing similar things is confusing — an agent may modify the wrong one.

### Plan
1. Audit: What does v2 do that stable doesn't? What does stable do better?
2. Check if any users/features depend specifically on the stable engine's behavior
3. If v2 is strictly better: deprecate stable, make v2 the only engine, remove the strategy selector
4. If both are needed: at minimum, complete Project 1 (shared code extraction) to reduce duplication

### Decision criteria
- If stable has unique behaviors worth keeping → keep both, but share code (Project 1)
- If v2 is a superset → remove stable, simplify the codebase by ~1,400 lines

---

## Project 6: Lazy-Load Generated Data Files

**Priority:** LOW | **Effort:** 3-4 hours | **Impact:** Reduced initial bundle size

### Problem
Generated data files in `apps/web/lib/generated/` total ~4.8 MB of TypeScript:
- `gem-details.ts` — 1.7 MB
- `stat-descriptions.ts` — 1.3 MB
- `asset-manifest.ts` — 911 KB
- `passive-tree-cluster-data.ts` — 267 KB
- `tree-manifest.ts` — 195 KB
- `pob-config-options.ts` — 113 KB

These are imported statically and included in the bundle even if the user never views that section of a build.

### Why it matters
- **End-user performance:** Smaller initial JS payload = faster page load, especially on mobile.
- **Build times:** Smaller bundles build faster.

### Plan
1. Profile actual bundle impact with `next build --analyze` (some may be tree-shaken or server-only)
2. For client-side data: convert static imports to `dynamic()` or lazy React imports where appropriate
3. For data only needed in specific panels: load on panel mount, not page load
4. Consider splitting `gem-details.ts` (1.7 MB) by use case (gem names vs full details)

### Note
This should be profiled before acting. Next.js may already handle some of this via server components and tree-shaking. The investigation step is most important.

---

## Project 7: Improve Type Safety for Generated Data

**Priority:** LOW | **Effort:** 1-2 hours | **Impact:** Better developer experience, safer refactors

### Problem
Generated data files are imported with `as` type assertions:
```typescript
const TREE_MANIFEST = GENERATED_TREE_MANIFEST as PassiveTreeManifest;
```

If the generation script output changes shape, the assertion still compiles but the data is wrong at runtime.

### Plan
1. Create typed wrapper functions instead of inline assertions:
   ```typescript
   // In a generated-data.ts helper
   export function getTreeManifest(): PassiveTreeManifest {
     return GENERATED_TREE_MANIFEST as PassiveTreeManifest;
   }
   ```
2. Add runtime validation for critical data (tree manifest, gem details) in development mode only
3. Add a CI check that runs the generation scripts and verifies output matches expected types

---

## Summary Table

| # | Project | Priority | Effort | Lines Saved/Moved | Key Benefit |
|---|---------|----------|--------|-------------------|-------------|
| 1 | Unify build-compare shared code | HIGH | 3-4h | ~1,800 removed | Eliminates duplication, single source of truth |
| 2 | Extract useResponsiveLayout hook | HIGH | 1-2h | ~60 consolidated | Consistent mobile detection, DRY |
| 3 | Extract items-panel helpers | MEDIUM | 1.5h | ~300 moved | Better AI readability, independent testability |
| 4 | Break up passive-tree-panel | MEDIUM | 4-5h | ~900 moved | Testable math, clearer concerns |
| 5 | Evaluate stable vs v2 engine | MED-LOW | 2-3h | up to 1,400 | Potential major simplification |
| 6 | Lazy-load generated data | LOW | 3-4h | 0 (bundle only) | Faster page loads |
| 7 | Type safety for generated data | LOW | 1-2h | 0 | Safer refactors, better DX |

### Recommended order of execution
1. **Project 1** first — biggest bang for buck, reduces confusion for all subsequent work
2. **Project 2** next — quick win, immediately useful
3. **Project 5** — decide on engine consolidation before writing more comparison tests
4. **Project 3** — straightforward extraction
5. **Project 4** — larger effort but high value
6. **Projects 6 & 7** — profile and improve incrementally
