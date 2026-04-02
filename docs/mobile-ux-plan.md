# Mobile UX Plan

This plan is focused on making `pob.codes` feel intentional on phone-sized screens without relying on production deploys or physical-device checks for every iteration.

## Goals

- use substantially more of the available mobile viewport width
- reduce oversized icons and card chrome on smaller screens
- avoid horizontal overflow in all major panels
- make the build page readable and tappable on common phone widths
- keep the mobile workflow local-first on Windows

## Current pain points

These are the most obvious issues in the current implementation:

- `apps/web/app/globals.css` sets `--build-page-side-padding` to `clamp(100px, 4vw, 100px)`, which is effectively `100px` on every screen and wastes a large amount of horizontal space on phones
- several layout breakpoints collapse columns, but inner panel spacing, fixed heights, and icon sizes remain too desktop-oriented
- passive-tree summary icons are large relative to the available text width, which makes keystone summary cards feel cramped
- gear slots are still visually heavy on small screens even after the mobile grid collapse
- the build header control strip wraps, but the mobile arrangement is not optimized for short vertical stacks and thumb-sized buttons
- tooltips are still largely desktop-hover-shaped, even where they have mobile fallbacks

## Scope

The work should stay focused on the main user-facing mobile experience:

- homepage import form
- recently viewed builds panel
- build header / title / action strip
- stats, items, skills, configs, passive tree, and notes panels
- modal behavior that can appear during mobile use

This plan does not require a visual redesign. It is a responsive layout and interaction pass.

## Implementation plan

### Phase 1: Establish mobile layout rules

1. Replace the fixed build-page side padding with a real responsive scale.
   Suggested target:
   - desktop: keep current generous gutters
   - tablet: moderate gutters
   - phone: `12px` to `16px`

2. Add a clearer breakpoint model in `apps/web/app/globals.css`.
   Suggested buckets:
   - `<= 1000px`: tablet / narrow laptop
   - `<= 768px`: large phone / small tablet
   - `<= 480px`: small phone

3. Audit every major grid to ensure children use `min-width: 0` and do not preserve desktop minimums that cause overflow.

### Phase 2: Tighten mobile density

1. Reduce panel padding on phones.
   Suggested target:
   - desktop: `16px`
   - phone: `10px` to `12px`

2. Reduce icon sizes where they currently dominate the row:
   - passive-tree summary icons
   - gear slots
   - gem cards if needed
   - recent-build action row controls if they look oversized

3. Reduce excessive fixed heights on mobile.
   Focus on:
   - passive tree canvas height
   - any panel that becomes too tall before the user reaches useful content

### Phase 3: Improve the build header and summary flow

1. Stack the build title, level, patch label, and summary lines more cleanly on narrow screens.

2. Rework the action strip so it is mobile-first:
   - one control per row, or
   - a compact two-column stack when width allows

3. Ensure buttons remain easy to tap.
   Suggested target:
   - minimum `40px` to `44px` tap height

### Phase 4: Improve content sections

1. Homepage / import form:
   - reduce outer whitespace
   - ensure the text area and submit controls use full width

2. Recently viewed builds:
   - keep the title/details readable without forcing the share button to wrap awkwardly
   - allow the action row to stack below the text on small screens

3. Gear panel:
   - reduce slot visual mass
   - ensure the 3-column mobile grid uses the full available width
   - check jewel and extra slot rows separately

4. Skills and config panels:
   - reduce side padding
   - verify text columns and value columns do not compress into unreadable widths

5. Passive tree panel:
   - reduce summary-icon size on phones
   - make summary cards breathe without wasting width
   - verify the tree canvas and summary panel order is still the right mobile order

6. Notes and compare modal:
   - confirm modal width and padding are usable on narrow screens
   - confirm long text does not force horizontal scrolling

### Phase 5: Touch-first polish

1. Identify hover-only affordances and confirm they have a mobile behavior.

2. Verify tooltip positioning and dismissal on narrow screens.

3. Check that sticky/fixed elements do not cover important content on mobile browser chrome.

## Recommended file targets

Most of the work will likely land in:

- `apps/web/app/globals.css`
- `apps/web/components/build-viewer.tsx`
- `apps/web/components/build-code-form.tsx`
- `apps/web/components/recent-builds-panel.tsx`
- `apps/web/components/items-panel.tsx`
- `apps/web/components/passive-tree-panel.tsx`

Tests should likely be added or updated in:

- `apps/web/app/b/[id]/page.test.tsx`
- `apps/web/components/recent-builds-panel.test.tsx`
- `apps/web/components/passive-tree-panel.test.tsx`
- any component test whose rendered structure changes materially

## Windows local workflow

This is the recommended no-production workflow on a Windows machine.

### Day-to-day local development

1. From the repo root, restart both local servers:

```powershell
npm.cmd run dev:restart
```

2. Use these local URLs:
   - web app: `http://localhost:3000`
   - worker: `http://localhost:8787`

3. Open the site in Chrome or Edge on Windows.

### Mobile testing without a phone

Use browser device emulation as the default loop:

1. Open DevTools with `F12`
2. Toggle device emulation with `Ctrl+Shift+M`
3. Test at minimum:
   - `iPhone SE` or custom `375x667`
   - `iPhone 12/13/14` or custom `390x844`
   - `Pixel 7` or custom `412x915`
   - `768x1024` tablet portrait

4. Test both:
   - full page load on `/`
   - a realistic build page on `/b/<id>`

5. Verify:
   - no horizontal scroll
   - buttons remain tappable
   - no text clipping
   - icons do not dominate card width
   - page gutters feel proportional

### Local production-like preview

For a more realistic pass than `next dev`, run the built preview locally:

1. Build everything:

```powershell
npm.cmd run build
```

2. Start the web preview server:

```powershell
npm.cmd run preview:web
```

3. Open the preview URL shown in the terminal and repeat the same device-emulation checks.

Use this when you want to validate production CSS/layout behavior without deploying to Cloudflare.

### Validation commands

Run these before any push:

```powershell
npm.cmd run typecheck
npm.cmd run test
```

Or run the full gate:

```powershell
npm.cmd run verify
```

## Optional local-only enhancements

These are not required for the first pass, but they would improve the mobile workflow:

1. Add a small set of viewport regression tests for narrow widths.

2. Add a local screenshot script using Playwright for key pages at common mobile widths.
   Suggested coverage:
   - homepage
   - loaded build page
   - passive tree section
   - gear section

3. Add a `mobile:review` script that runs:
   - `build`
   - local preview
   - screenshot capture for a fixed list of viewport sizes

## Execution order

Recommended order when implementing:

1. fix global page gutters and panel padding
2. fix build header and action-strip wrapping
3. reduce oversized icons in recent builds, gear, and passive-tree summary cards
4. tune panel-specific mobile layouts
5. run a dedicated mobile review pass in browser emulation
6. only after local signoff, push and let Cloudflare deploy

## Definition of done

The mobile pass is done when:

- the homepage and build page have no horizontal overflow at `375px`
- the build page uses most of the viewport width on phones
- icons feel proportionate to the text beside them
- the passive-tree summary cards remain readable without giant icon blocks
- the local Windows workflow is enough to review changes confidently before any push
