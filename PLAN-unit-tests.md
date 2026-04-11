# Unit Test Implementation Plan

> Generated 2026-04-05 | 29 existing test files, 16 untested source files identified

## Current Test Inventory

The project uses **Vitest** with **React Testing Library** for component tests and **jsdom** for browser simulation. Tests run via `npm run test` across all workspaces.

### Existing Coverage (29 test files)

| Area | File | What It Tests |
|------|------|---------------|
| **Page** | `app/b/[id]/page.test.tsx` | Build viewer page rendering, DPS display, clipboard copy |
| **Components** | `build-viewer-modal.test.tsx` | eHP modal, mobile tooltip flow |
| | `build-viewer.test.ts` | `buildLoadoutTitle` helper (title formatting, ascendancy, support gem filtering) |
| | `compare-build-modal.test.tsx` | Modal open/submit, findings rendering, item filters, support gem layout |
| | `items-panel.test.tsx` | Tooltip sections, influence icons, mobile viewport |
| | `notes-panel.test.tsx` | URL rendering as links, text preservation |
| | `passive-tree-panel.test.tsx` | SVG tree simulation, pointer capture, fetch mocking |
| | `recent-builds-panel.test.tsx` | Empty state, stored builds rendering, pin/rename/remove |
| | `skills-panel.test.tsx` | Socket group merging, gem connector display |
| | `stats-panel.test.tsx` | Duplicate minion stat rows (React key warnings) |
| **Libraries** | `api-base.test.ts` | URL normalization, env var parsing, localhost handling |
| | `build-compare-v2.test.ts` | V2 comparison: items, stats, jewels, tree diffs |
| | `build-compare.test.ts` | V1 comparison: config, gem, anoint, unique, jewel, tree diffs |
| | `build-overview.test.ts` | Recent build snapshots, patch version fallback/formatting |
| | `build-viewer-selection.test.ts` | Loadout application, matching, getters |
| | `format-value.test.ts` | Integer separators, decimals, booleans, non-numeric preservation |
| | `icon-paths.test.ts` | Unique art preference, base item icons, rare fallback |
| | `local-host.test.ts` | Localhost detection, forwarded headers |
| | `passive-tree.test.ts` | Layout augmentation, links, viewport, node descriptions, sprites |
| | `passive-tree-timeless.test.ts` | Timeless keystone transformation, jewel inscription format |
| | `pob-config-display.test.ts` | Config grouping, section building, custom modifier separation |
| | `pob-notes.test.ts` | Color code parsing, blank lines, default color |
| | `pob-stat-layout.test.ts` | Max hit labels, skill payload building |
| | `recent-builds.test.ts` | Entry parsing, deduplication, size capping, merging |
| **Worker** | `index.test.ts` | All endpoints (POST /pob, GET /:id/json, etc.), KV mocking, rate limiting |
| | `import-resolver.test.ts` | Redirect following, URL resolution, unsupported hosts, oversized responses |
| **Packages** | `pob-codec/index.test.ts` | XML round-trip, empty/invalid input errors |
| | `pob-parser/index.test.ts` | Minimal PoE1 XML parsing (all sections) |
| | `pob-parser/item-parser.test.ts` | Rare/magic parsing, explicit mod order, footer filtering |

---

## New Tests to Write

### Priority 1 — HIGH (Core business logic, complex, most likely to regress)

---

#### 1. `build-compare-stable.test.ts`

**File under test:** `apps/web/lib/build-compare-stable.ts` (1,377 lines)

**What it does:** The "stable" build comparison engine. Compares two BuildPayloads and produces a structured report of differences across items, gems, skills, passive tree, and configs.

**Why it needs tests:** This is a core feature with complex logic and no dedicated tests. The v2 engine has tests but the stable engine does not. Both are actively used (the UI lets users pick which engine to use). Regressions here silently produce wrong comparison results.

**Test cases to write:**
1. **Identical builds produce empty report** — Compare a payload against itself, assert zero findings.
2. **Item differences detected** — Change an item's base/name in one payload, verify the finding identifies the slot, old value, and new value.
3. **Gem differences detected** — Add/remove/change a support gem in one payload, verify gem comparison findings (name, level, quality).
4. **Config differences detected** — Modify config values between payloads, verify config findings appear with correct labels and values.
5. **Tree node differences detected** — Allocate/deallocate passive tree nodes, verify tree findings report added/removed nodes.
6. **Jewel differences detected** — Change socketed jewels, verify jewel comparison findings.
7. **Anoint differences detected** — Change allocated anoints, verify findings.
8. **Mixed differences** — Multiple categories of differences at once, verify report contains all categories and correct severity levels.
9. **Edge case: empty payloads** — Minimal/empty payloads don't crash.

**Test approach:** Use helper factories (similar to `build-compare-v2.test.ts`) to create minimal BuildPayload objects, then call `buildBuildComparisonReport()` and assert on the returned `BuildCompareReport` structure.

---

#### 2. `pob-stat-layout.test.ts` (expand existing)

**File under test:** `apps/web/lib/pob-stat-layout.ts` (581 lines)

**What it does:** Transforms raw BuildPayload stats into display-ready stat rows for the player stats panel, minion stats panel, and max-hit breakdown. Contains complex logic for stat visibility, charge combining, overcap display, and skill-type flag inference.

**Why it needs more tests:** The existing test file only covers max hit labels and skill payload building. The bulk of the logic — `buildPlayerStatRowsForDisplay`, `buildMinionStatRowsForDisplay`, and the charge/overcap formatting — is untested.

**Test cases to add:**
1. **Player stat rows: basic rendering** — Given a payload with common stats (life, mana, ES, resistances), verify correct rows appear with formatted values.
2. **Player stat rows: charge combining** — Given frenzy/power/endurance current+max pairs, verify they combine into "X / Y" display format.
3. **Player stat rows: overcap display** — Given capped resistances with overcap values, verify overcap appears in parentheses.
4. **Player stat rows: hidden stats** — Given stats that should be hidden (zero values, irrelevant to build), verify they are filtered out.
5. **Player stat rows: percentage formatting** — Verify stats with percentage format display correctly (e.g., "75%" not "0.75").
6. **Minion stat rows** — Given a minion-focused build, verify minion-specific rows appear.
7. **Minion stat rows: empty when no minions** — Non-minion builds produce no minion rows.
8. **Skill type flag inference** — Given different skill types (attack, spell, DOT), verify correct stat visibility flags are set.
9. **Edge case: missing stats object** — Payload with empty/missing stats doesn't crash.

**Test approach:** Build minimal BuildPayload objects with specific stat keys/values, call the builder functions, assert on returned `ExportedStatRowDisplay[]` arrays.

---

#### 3. `build-code-form.test.tsx`

**File under test:** `apps/web/components/build-code-form.tsx` (148 lines)

**What it does:** The home page form where users paste PoB codes or select sample builds. Handles async API calls, loading states, error display, and navigation on successful upload.

**Why it needs tests:** This is the primary entry point for users. It has async data fetching, form validation, error handling, and router navigation — all things that commonly regress.

**Test cases to write:**
1. **Renders textarea and submit button** — Basic render test.
2. **Submit with empty code shows error** — Submit form with no input, verify error message appears.
3. **Submit with valid code calls API and navigates** — Mock fetch to return `{ id: "abc123" }`, verify `router.push("/b/abc123")` is called.
4. **Submit shows loading state** — After submit, verify loading indicator appears and button is disabled.
5. **API error displays error message** — Mock fetch to return error, verify error text renders.
6. **Sample build selection** — Click a sample, verify textarea populates with sample code.
7. **Sample loading shows loading state** — While sample is loading, verify loading indicator.
8. **Sample loading failure** — Mock sample API failure, verify graceful handling.

**Test approach:** Render `<BuildCodeForm />` with mocked `fetch` and `useRouter`. Use React Testing Library's `userEvent` for interactions. Assert on DOM state and mock call arguments.

---

#### 4. `configs-panel.test.tsx`

**File under test:** `apps/web/components/configs-panel.tsx` (76 lines)

**What it does:** Displays build configuration sets in a dropdown + grid layout. Users select a config set, and the panel renders all config rows for that set.

**Why it needs tests:** Config display logic (conditional rendering, set selection, formatted output) is user-facing and could regress when config display helpers change.

**Test cases to write:**
1. **Renders config sections and rows** — Given a payload with config data, verify sections and key-value rows render.
2. **Config set selector** — Given multiple config sets, verify dropdown renders options and switching sets updates displayed rows.
3. **Empty config set** — Given a config set with no values, verify "no configuration" or empty state.
4. **Custom modifiers section** — Verify custom modifiers render in their own section.

**Test approach:** Render `<ConfigsPanel payload={...} />` with fixture data. Use React Testing Library to interact with dropdown and assert on rendered rows.

---

### Priority 2 — MEDIUM (Moderate logic, user-facing, or security-relevant)

---

#### 5. `sample-pob-files.test.ts`

**File under test:** `apps/web/lib/sample-pob-files.ts` (39 lines)

**What it does:** Lists and reads sample PoB files from the data directory. Includes path validation and traversal prevention.

**Why it needs tests:** Contains security-relevant path validation logic. A regression could allow path traversal.

**Test cases to write:**
1. **listSamplePobFiles returns .txt files** — Verify it returns an array of `{ id, label }` objects for .txt files in data/.
2. **readSamplePobFile returns file content** — Given a valid sample ID, returns the file content string.
3. **readSamplePobFile rejects path traversal** — IDs like `../../../etc/passwd` or `..\\secret` return undefined.
4. **readSamplePobFile rejects invalid IDs** — IDs with special characters that don't match the regex return undefined.
5. **readSamplePobFile returns undefined for missing files** — Non-existent ID returns undefined.

**Test approach:** These are pure functions. Call directly and assert returns. May need to mock `fs` if running in non-Node environment, or use actual data/ directory if available.

---

#### 6. `api/pob-samples/route.test.ts`

**File under test:** `apps/web/app/api/pob-samples/route.ts` (20 lines)

**What it does:** API route that returns sample PoB file list. Only responds to localhost requests (development-only endpoint).

**Why it needs tests:** Security boundary — this endpoint must not serve data to non-local requests.

**Test cases to write:**
1. **Local request returns sample list** — Mock `isLocalRequest` to return true, verify JSON response with samples array.
2. **Non-local request returns 404** — Mock `isLocalRequest` to return false, verify 404 response.
3. **Error handling** — Mock `listSamplePobFiles` to throw, verify 500 or graceful error response.

**Test approach:** Import the `GET` handler, call it with a mock `Request` object, assert on Response status and body.

---

#### 7. `api/pob-samples/[sampleId]/route.test.ts`

**File under test:** `apps/web/app/api/pob-samples/[sampleId]/route.ts` (29 lines)

**What it does:** Dynamic API route that returns the content of a specific sample file. Localhost-only.

**Test cases to write:**
1. **Local request with valid ID returns file content** — Verify text/plain response with correct content.
2. **Local request with invalid ID returns 404** — Verify 404 for non-existent sample.
3. **Non-local request returns 404** — Verify 404 regardless of valid ID.
4. **Response headers** — Verify correct content-type and cache-control headers.

---

#### 8. `weapon-swap.test.ts`

**File under test:** `apps/web/lib/weapon-swap.ts` (15 lines)

**What it does:** Checks if a given item slot name belongs to the weapon swap set.

**Why it needs tests:** Simple but important — weapon swap logic affects item display throughout the app.

**Test cases to write:**
1. **Recognizes weapon swap slots** — "Weapon 1 Swap", "Weapon 2 Swap", etc. return true.
2. **Rejects non-swap slots** — "Weapon 1", "Helmet", "Body Armour" return false.
3. **Handles null/undefined** — Returns false without throwing.
4. **Handles whitespace** — Trimmed strings still match.

**Test approach:** Direct function calls with assertions.

---

#### 9. `notes-config-panel.test.tsx`

**File under test:** `apps/web/components/notes-config-panel.tsx` (62 lines)

**What it does:** Displays build notes and configuration in a combined panel (used in certain layouts).

**Test cases to write:**
1. **Renders notes when present** — Verify notes text appears.
2. **Hides notes section when empty** — Verify notes section is not rendered.
3. **Renders config entries** — Verify config key-value pairs display.
4. **Config set selection** — Verify switching config sets updates display.

---

#### 10. `clipboard.test.ts`

**File under test:** `apps/web/lib/clipboard.ts` (22 lines)

**What it does:** Copies text to clipboard with modern API + legacy fallback.

**Test cases to write:**
1. **Uses Clipboard API when available** — Mock `navigator.clipboard.writeText`, verify it's called.
2. **Falls back to execCommand** — Mock missing Clipboard API, verify `document.execCommand('copy')` fallback.
3. **Handles API rejection** — Mock `writeText` to reject, verify error propagates.

**Test approach:** Mock browser globals (`navigator.clipboard`, `document.execCommand`).

---

### Priority 3 — LOW (Simple/presentational, unlikely to regress)

---

#### 11. `build-header.test.tsx`

**File under test:** `apps/web/components/build-header.tsx` (19 lines)

**What it does:** Renders class name, ascendancy, level, game version, and build ID.

**Test cases to write:**
1. **Renders all fields** — Verify class, ascendancy, level, version all appear.
2. **Handles missing ascendancy** — Verify graceful rendering when ascendancy is undefined.

---

#### 12. `ascendancy-names.test.ts`

**File under test:** `apps/web/lib/ascendancy-names.ts` (25 lines)

**What it does:** Static lookup of secondary ascendancy names by ID.

**Test cases to write:**
1. **Known ID returns name** — Verify known IDs return correct ascendancy names.
2. **Unknown ID returns undefined** — Verify unknown IDs return undefined gracefully.
3. **Undefined input returns undefined** — Verify no crash on undefined input.

---

#### 13. `fetch-build.test.ts`

**File under test:** `apps/web/lib/fetch-build.ts` (21 lines)

**What it does:** Fetches a BuildPayload from the API with Next.js cache revalidation.

**Test cases to write:**
1. **Successful fetch returns payload** — Mock fetch, verify parsed JSON returned.
2. **404 response throws** — Mock 404 fetch, verify error thrown.
3. **Network error propagates** — Mock fetch rejection, verify error.
4. **Passes correct revalidation config** — Verify fetch is called with `{ next: { revalidate: 60 } }`.

---

### Expanded Coverage for Existing Tests

---

#### 14. `pob-parser/index.test.ts` (expand)

**Current coverage:** Minimal PoE1 XML parsing.

**Additional test cases:**
1. **Complex build with multiple item sets** — Verify all item sets are parsed.
2. **Build with multiple skill sets** — Verify skill set selection.
3. **Build with multiple tree specs** — Verify each tree spec's nodes and mastery effects.
4. **Malformed XML** — Verify graceful error with descriptive message.
5. **Missing sections** — XML with no items/skills/tree sections still parses without crash.
6. **Large real-world builds** — Use sample .txt files from data/ as regression fixtures.

---

#### 15. `pob-parser/item-parser.test.ts` (expand)

**Current coverage:** Rare parsing, magic flasks, explicit mod order.

**Additional test cases:**
1. **Unique item parsing** — Verify unique name, base, and mods extracted correctly.
2. **Influenced items** — Verify Shaper/Elder/etc. influence flags.
3. **Socketed items** — Verify socket string parsing (e.g., "R-G-B-B R").
4. **Crafted mod identification** — Verify crafted mods separated from regular explicits.
5. **Enchanted items** — Verify enchantment lines extracted.
6. **Relic rarity** — Verify relic items parsed with correct rarity.
7. **Items with requirements** — Verify level/str/dex/int requirements.

---

#### 16. `pob-codec/index.test.ts` (expand)

**Current coverage:** Round-trip, empty input, invalid input.

**Additional test cases:**
1. **Large build codes** — Verify encode/decode of very large XML strings (stress test).
2. **Special characters in XML** — Verify round-trip preserves unicode, special entities.
3. **Whitespace preservation** — Verify XML whitespace survives round-trip.
4. **URL-safe base64** — Verify output uses URL-safe alphabet (no +, /, =).

---

## Implementation Notes

### Test file naming convention
All test files follow `{source-file}.test.{ts|tsx}` in the same directory as the source.

### Shared test utilities
- Existing fixture: `apps/web/test/fixtures/build-viewer-fixture.ts`
- The `build-compare-v2.test.ts` has good helper factories for creating test payloads — consider extracting these to a shared fixture file for reuse across new tests.

### Running tests
```bash
npm run test              # All workspaces
npm run test --workspace @pobcodes/web   # Web only
npm run test --workspace @pobcodes/worker # Worker only
```

### Environment setup
- Component tests require `// @vitest-environment jsdom` pragma
- Library tests run in Node by default
- Mock patterns established in existing tests (fetch, localStorage, matchMedia, requestAnimationFrame)
