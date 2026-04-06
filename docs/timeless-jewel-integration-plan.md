# Timeless Jewel Integration Plan

## Goal

Add deterministic timeless jewel comparison support to local `v2` without
making the normal compare flow noticeably slower.

## Current Constraints

- The compare modal is client-side and currently calls
  `compareBuildAgainstInput` directly from `apps/web/lib/build-compare.ts`.
- Path of Building exports do not reliably include transformed timeless notable
  results in `tree.overrides`, so compare cannot depend on exported override
  text alone.
- The `Vilsol/timeless-jewels` stack has a cheap per-node calculation path and
  an expensive reverse-search path. We only need the per-node path.
- The upstream timeless data bundle is small enough to load lazily on the
  server, but too large to casually push into the browser compare bundle.

## Lowest-Risk Architecture

Keep timeless calculation off the browser and resolve it on demand in a server
endpoint.

### Why

- Avoid shipping the timeless runtime and data bundle to every compare user.
- Avoid increasing initial client bundle size for the compare modal.
- Keep the expensive data load in one long-lived server runtime instead of one
  load per browser session.
- Allow aggressive server-side caching keyed by deterministic timeless inputs.

## Recommended Shape

### 1. Add a dedicated resolver module

Create an isolated server-only module, for example:

- `apps/web/lib/timeless-resolver/`

The module should expose a narrow API like:

- `resolveTimelessNodeEffects(treeVersion, jewelType, conqueror, seed, nodeIds)`

Its output should be normalized final effects only:

- resolved keystone replacement
- resolved notable replacement effect lines
- resolved small-passive addition effect lines
- resolved Militant Faith devotion-scaled effect lines after devotion is known

### 2. Add a server endpoint

Create a batch endpoint, for example:

- `apps/web/app/api/timeless-resolve/route.ts`

The request should contain only the minimum deterministic inputs:

- jewel type
- conqueror / variant
- seed
- socket identifier or affected node ids
- active tree version
- allocated node ids in radius

The endpoint should return normalized effect rows, not raw upstream objects.

### 3. Keep compare fast by short-circuiting

Do not call the endpoint unless at least one build contains a timeless jewel
that needs resolved comparison.

Normal compare flow stays unchanged for builds with:

- no timeless jewels
- only timeless keystone cases already covered by current local logic

### 4. Resolve only allocated nodes in radius

Do not calculate every node in the jewel radius unless it is allocated and
relevant to compare.

For each timeless jewel instance:

- find nodes in radius from the socket
- filter to allocated nodes only
- batch-resolve only those node ids

That keeps each compare request small even for multiple timeless jewels.

### 5. Cache aggressively on the server

Use two cache levels.

Level 1:
- cache timeless static data load in module scope

Level 2:
- cache per-node results by
  `treeVersion + jewelType + conqueror + seed + passiveId`

This makes repeated comparisons cheap and avoids recomputation when many users
compare common seeds.

## Compare Output Rules

### Elegant Hubris

Compare allocated notable outcomes by final effect text only.

Example:

- `10% increased Damage per Frenzy Charge`
- `10% increased Damage per Power Charge`

The transformed notable name does not matter.

Recommended output:

- `Compared Field`
- `Only in Source Build`
- `Only in Your Build`

### Militant Faith

Resolve devotion first, then compare the final scaled effects.

Rules:

- devotion itself is an input to effect resolution, not the main diff target
- compare the final scaled bonus text after devotion is applied
- compare keystone transformation separately from notable/passive effects

### Other timeless jewels

Normalize to final resolved effect text and then compare:

- pooled by final effect for notables/passives
- by final transformed keystone for keystones

## Implementation Order

1. Add a server-only request/response contract and a stub endpoint.
2. Extract a timeless-jewel descriptor parser from current item parsing:
   - jewel type
   - conqueror
   - seed
   - selected variant when present
3. Reuse current socket/radius helpers to collect affected allocated nodes.
4. Implement the server resolver and normalize its output into plain text rows.
5. Wire `build-compare-v2` to call the endpoint only when needed.
6. Replace the current partial local timeless diff paths with resolved-output
   comparisons.
7. Add caching and measure cold vs warm compare timings.

## Performance Guardrails

- No client-side WASM for compare.
- No reverse-search integration in compare.
- No full-tree timeless evaluation.
- No endpoint call unless a timeless jewel is present.
- Batch all node ids for a single jewel into one request.
- Memoize repeated node resolutions on the server.

## Testing Requirements

Add focused tests for:

- Elegant Hubris with different final notable bonuses across builds
- Elegant Hubris with different seed ids but same final allocated effects
- Militant Faith devotion-scaled effects
- timeless keystone equivalence by conqueror
- multiple timeless jewels in one compare
- no-timeless builds remaining on the current fast path

## Rollout Strategy

Implement behind local `v2` only first.

Success criteria:

- no visible slowdown for non-timeless compares
- one network request at most per build compare when timeless resolution is
  needed
- resolved timeless differences appearing in compare output with no raw seed
  noise
