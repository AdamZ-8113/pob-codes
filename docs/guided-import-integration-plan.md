# Guided Import Integration Plan

## Goal

Bring the browser-worker PoB spike into the core app as a polished guided flow
that:

- feels like the rest of `pob.codes`
- keeps full PoB calculations on the user's device
- leads users through a mobile-first stepper workflow
- hands the final PoB code off to the existing `/b/[id]` viewer

The intent is not to merge the spike UI wholesale. The intent is to keep the
runtime and calculation capability, then rebuild the product surface in
`apps/web`.

## Recommended Product Shape

Add a new guided import route in the core app, for example:

- `apps/web/app/import/page.tsx`

This route becomes the "full guided build import" path for users who want to:

- import from a Path of Exile account
- apply guide configs from `pob.codes`, `pobb.in`, or similar
- adjust PoB configs and skills locally
- manually recalculate
- open the finalized build in the existing viewer

The existing homepage paste flow should remain as the fast path for users who
already have a PoB code or supported URL.

## Core Architecture

### Keep the full calc runtime client-side

The browser-worker runtime should stay in the browser, not in `apps/worker`.

Why:

- avoids hosted CPU cost for full PoB calculations
- preserves the main value proven by the spike
- makes mobile and tablet use possible without server-side calc scaling

Recommended split:

- `apps/web`: guided import UI, stepper flow, worker bridge, static/runtime
  asset serving, PoE profile proxy, preset import proxy, final upload handoff
- `apps/worker`: unchanged hosted build ingest and read-only payload serving

### Use the existing build viewer as the destination state

Do not merge the guided import editor into `BuildViewer` for v1.

Recommended flow:

1. user completes import/config in the guided flow
2. browser worker exports the final PoB code
3. web app posts that code to existing `POST /pob`
4. user is routed to `/b/[id]`
5. existing `BuildViewer` renders the result

This keeps the risky editable workflow isolated from the mature read-only
viewer.

## Recommended Stepper Flow

Use a real stepper, not a long scrolling form.

Recommended steps:

### 1. Account

Inputs:

- account name
- optional `POESESSID`

Primary action:

- `Load Account`

Output:

- list of leagues and characters for that account

### 2. Character

Inputs:

- league selector
- character selector

Primary action:

- `Continue`

Notes:

- if the account only has one relevant league or one character, preselect it
- keep the step focused on selection, not loading the build yet

### 3. Load Build

Primary action:

- `Load Character`

What happens here:

- targeted PoB files are selected
- browser worker mounts assets
- PoB boots
- character data is imported
- first local calculation runs

Output:

- loaded build summary
- first stat snapshot
- config and skills schema become available

### 4. Apply Guide Configs (Optional)

Inputs:

- build link or PoB code from `pob.codes`, `pobb.in`, etc.

Primary actions:

- `Load Preset`
- `Skip`

Output:

- preset values copied into draft config state only

### 5. Skills And Configs

Inputs:

- primary skill group
- primary active skill
- socket group toggles
- gem toggles
- config controls exported from PoB

Primary action:

- `Update Calculations`

Important behavior:

- edits are draft-only until the user presses the button
- no auto-recalc on every checkbox change

### 6. Review And Open

Actions:

- `Copy PoB Code`
- `Copy Config Preset`
- `Open In Viewer`

Output:

- uploads final code to existing backend
- routes to `/b/[id]`

## UX Recommendations

### Mobile-first layout

The stepper should be optimized for narrow screens first.

Recommended behavior:

- one active step card at a time
- previous steps collapse into summary cards
- next steps stay disabled until prerequisites are complete
- sticky bottom action bar on mobile for `Back`, `Continue`, `Update
  Calculations`, or `Open In Viewer`
- diagnostics hidden behind a collapsed `details` panel

### Back navigation

Users should be able to go back without losing everything.

Recommended rules:

- going back from `Review` to `Skills And Configs` preserves draft edits
- going back from `Skills And Configs` to `Apply Guide Configs` preserves the
  loaded character and current runtime
- changing account or character invalidates downstream steps and requires a new
  load

### Progress and trust

The calc step can still take several seconds on weaker devices, so the user
must never feel stuck.

Recommended feedback during `Load Build` and `Update Calculations`:

- current phase label
- elapsed time
- compact timing row for major phases
- expandable diagnostics for logs and raw metrics

## Styling Strategy

### Reuse core app primitives first

The new flow should reuse the existing styling vocabulary from
`apps/web/app/globals.css` rather than keeping a separate spike design.

Directly reuse where possible:

- `.panel`
- `.panel-toolbar`
- `.panel-select`
- `.btn`
- `.btn-secondary`
- `.meta`
- `.error-box`
- `.code-area`
- existing dark theme variables in `:root`

### Add wizard-specific primitives to `globals.css`

Add a small shared layer for the new workflow instead of route-local styling
for everything.

Suggested additions:

- `.wizard-shell`
- `.wizard-stepper`
- `.wizard-step`
- `.wizard-step--active`
- `.wizard-step--complete`
- `.wizard-step-summary`
- `.wizard-actions`
- `.wizard-actions--sticky`
- `.wizard-section`
- `.wizard-field-grid`
- `.wizard-chip`
- `.wizard-timing-grid`

These should use the same color tokens, border radius, spacing scale, and
button styles already present in the app.

### Keep route-local CSS small

If a route-local stylesheet is needed, keep it focused on layout-only concerns.

Recommended split:

- `globals.css`: reusable shared primitives and tokens
- guided import route or component CSS: only what is too specific to the wizard

## Implementation Shape

### 1. Extract the spike runtime into core-app modules

Move the browser-worker integration into typed app code under something like:

- `apps/web/lib/browser-pob/`
- `apps/web/workers/pob-runtime.worker.ts`

Suggested modules:

- `browser-pob-client.ts`
- `browser-pob-types.ts`
- `browser-pob-state.ts`
- `pob-runtime.worker.ts`

The goal is to replace the spike's DOM-driven `ui-main.js` with typed message
contracts and React state.

### 2. Add server routes for import helpers

The core app needs thin proxy/helper endpoints for:

- loading PoE account characters
- loading PoE character import data
- resolving supported external preset links
- serving the targeted runtime manifest

These can live under:

- `apps/web/app/api/...`

This keeps account/session handling and external fetch logic out of the client.

### 3. Build the guided import route as React components

Suggested component shape:

- `apps/web/app/import/page.tsx`
- `apps/web/components/guided-import/guided-import-page.tsx`
- `apps/web/components/guided-import/guided-import-stepper.tsx`
- `apps/web/components/guided-import/steps/account-step.tsx`
- `apps/web/components/guided-import/steps/character-step.tsx`
- `apps/web/components/guided-import/steps/load-step.tsx`
- `apps/web/components/guided-import/steps/preset-step.tsx`
- `apps/web/components/guided-import/steps/configure-step.tsx`
- `apps/web/components/guided-import/steps/review-step.tsx`

### 4. Keep wizard state in one reducer

This flow has too many dependent pieces for scattered `useState`.

Use a reducer or equivalent state machine for:

- current step
- account lookup state
- selected league and character
- runtime status
- loaded build summary
- config draft state
- skill draft state
- preset import state
- final exported PoB code

This will make step invalidation and back-navigation much safer.

### 5. Upload only at the end

Do not create hosted builds on every intermediate recalc.

Recommended rule:

- keep everything local until the user explicitly clicks `Open In Viewer`

That avoids unnecessary uploads and keeps the hosted backend aligned with final
user intent.

## What Can Be Reused From Existing Core App

### Reuse as-is or nearly as-is

- overall shell and dark theme from `apps/web/app/layout.tsx` and
  `apps/web/app/globals.css`
- buttons, panels, form controls, metadata text
- existing `/b/[id]` viewer route
- existing `POST /pob` upload path and `/b/[id]` read path

### Reuse conceptually, but not literally

- `ConfigsPanel`
- `SkillsPanel`

These are already good references for look and feel, grouping, labels, and
mobile constraints, but the guided import flow needs editable controls rather
than the current read-only viewer panels.

### Keep isolated from the viewer for v1

Avoid rewriting these parts immediately:

- `BuildViewer`
- `StatsPanel`
- `ItemsPanel`
- `PassiveTreePanel`
- `NotesPanel`

They are already the correct end-state after final code upload.

## Main Technical Considerations

### Asset delivery and caching

The PoB runtime payload is still large.

We should:

- keep the runtime route fully lazy-loaded
- serve manifest-driven static assets with long cache headers
- only fetch targeted tree and timeless data for the loaded build
- preserve the worker instance across wizard steps

### Browser-only boundaries

The PoB runtime must never leak into the main app bundle for normal users.

We should:

- load the worker only inside the guided import route
- use dynamic import for heavy runtime helpers
- avoid importing worker-specific modules into shared homepage or viewer code

### Session privacy

`POESESSID` handling needs strict rules.

We should:

- never persist it to local storage
- never include it in logs
- never reflect it into the URL
- keep it in memory only for the current import session

### Config parity

The live editable config UI should continue to come from the loaded PoB build,
not from a static hand-maintained schema.

Why:

- conditional visibility changes per build
- skill-dependent config visibility changes at runtime
- the worker already proved this model works

### Recalc boundaries

`Update Calculations` should remain explicit.

We should not auto-run on:

- checkbox changes
- gem toggles
- primary skill changes
- preset load

Those should mark the step dirty and wait for explicit user action.

### Failure recovery

When PoE import, preset import, or calc fails, the user needs a recoverable
state.

Recommended behavior:

- keep prior successful step data
- show the failure inside the current step
- allow retry without forcing a full reload

## Suggested Phased Delivery

### Phase 1: Architecture extraction

- move the browser-worker code out of `tmp/` into typed core-app modules
- add the manifest and import helper routes to `apps/web`
- verify the runtime still boots and loads a character locally

### Phase 2: Stepper shell and styling

- add the guided route
- build the stepper shell
- reuse global styles and add shared wizard primitives
- ship the account, character, and load steps first

### Phase 3: Config and skill editing

- port editable config UI
- port skill group and gem toggle editing
- keep explicit `Update Calculations`
- add timing and diagnostics panel

### Phase 4: Final handoff

- export final PoB code
- upload through existing `/pob`
- redirect to `/b/[id]`
- verify the viewer matches the configured build

### Phase 5: Polish and hardening

- tighten mobile UX
- improve progress messages
- add tests
- validate Firefox and mid-range mobile behavior

## Testing Requirements

Add coverage for:

- stepper progression and back-navigation
- account import and character selection
- failure states for PoE import and preset import
- config edit dirty-state behavior
- explicit recalc behavior
- final upload handoff to `/b/[id]`
- route-level lazy loading so the normal homepage/viewer bundles do not bloat

Manual validation should include:

- Chrome desktop
- Firefox desktop
- Android Chrome on a real mid-range device

## Questions To Answer Before Implementation

### Product decisions

1. Should the guided import route become the primary homepage experience, or
   should it be a secondary entry point next to the existing paste form?
2. After the user opens `/b/[id]`, do we want the build to remain read-only, or
   should we eventually support reopening the editable guided state from the
   viewer?
3. Should guide preset import stay optional and skippable as its own step, or
   should it be folded into the config step?
4. Do we want anonymous users to use the full guided flow immediately, or do we
   want any gating for private-account imports involving `POESESSID`?

### UX decisions

1. Do you want league and character selection as one step or two separate
   steps?
2. Should the stepper show all steps across the top on desktop, with a compact
   current-step summary on mobile?
3. After `Load Character`, should we auto-advance to the next step or leave the
   user on the load step with a success summary and a `Continue` button?
4. On the review step, should `Open In Viewer` replace the current page, or
   open a new tab and keep the wizard session alive?

### Technical decisions

1. Do we want the guided route to live under `/import`, `/create`, or another
   permanent URL?
2. Do we want to keep the runtime implementation inside `apps/web`, or do we
   want to extract it into a reusable package after the first integration pass?
3. Do we want to persist in-progress wizard state locally so a refresh does not
   lose the session, or is in-memory state enough for v1?

## Recommended Default Answers

If we want the lowest-risk first integration, I recommend:

- keep the existing homepage paste form as the fast path
- add guided import as a separate route linked prominently from the homepage
- keep the viewer read-only for v1
- keep guide preset as its own optional step
- combine league and character into one step if the UI stays clean
- replace the page on `Open In Viewer`
- keep wizard state in memory only for v1
- keep the runtime implementation in `apps/web` first, then extract later only
  if reuse pressure appears

## Confirmed Decisions

These are now fixed unless we explicitly change scope later:

- guided import will live on a separate route with a homepage button labeled
  `Import a Character`
- the step order is `Account -> League -> Character -> Load Build -> Guide
  Configs -> Skills And Configs -> Review`
- the `POESESSID` path is removed from the product flow; the user must make the
  Path of Exile profile public
- successful steps should auto-advance
- `Open In Viewer` should open the final build in a new tab
- the existing build viewer remains read-only

## Implementation Order

### Phase 1: Core app shell and server helpers

- add the new `/import` route
- add the homepage `Import a Character` button
- add shared wizard styles in `globals.css`
- add core-app API routes for:
  - browser PoB manifest
  - browser PoB runtime file serving
  - public PoE character lookup
  - public PoE character import
  - guide preset resolution
  - local viewer handoff

### Phase 2: Browser runtime extraction

- move the spike worker runtime into `apps/web`
- replace spike endpoint paths with core-app route paths
- prove that the runtime mounts and boots from the core app route
- connect `Load Character` to the real browser worker flow

### Phase 3: Guided load flow

- implement the real `Load Build` step
- add progress phases, timings, and collapsed diagnostics
- preserve back-navigation without dropping the worker session

### Phase 4: Config and skill editing

- port editable config rendering into React
- port primary skill, group, and gem controls
- keep explicit `Update Calculations`
- support guide preset application on draft state

### Phase 5: Review and handoff

- export final PoB code
- support `Copy PoB Code`
- support `Copy Config Preset`
- support `Open In Viewer` in a new tab using the existing `/b/[id]` route

### Phase 6: Polish

- tighten mobile stepper behavior
- verify Firefox and real mobile performance
- add route and API tests
