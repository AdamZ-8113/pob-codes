# PoB Codes — Implementation Overview

## What This Is

A web application that decodes Path of Building (PoB) shareable build codes and renders them
as a visual build summary — showing the passive skill tree, equipped items with icons, gem
setups, and key stats. It is a read-only viewer; it does not perform stat calculations.

## Data Flow

```
User visits /?code=<PoB_string>   OR   /builds/<slug>
         |
         v
  Decode build string
  base64url → zlib decompress → XML string
         |
         v
  Parse XML into structured JS objects
  (Build metadata, Items, Skills, Tree, Stats)
         |
         +--> Passive Tree Renderer (PixiJS canvas)
         |      Uses: grindinggear/skilltree-export data.json + assets/
         |
         +--> Item Display (HTML/CSS tooltips)
         |      Icons: RePoE base_items.json → web.poecdn.com CDN URL
         |
         +--> Skills Panel (HTML table)
         |
         +--> Stats Panel (pre-computed PlayerStat values from XML)
```

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Framework | Next.js (App Router) | SSR for SEO + client components for canvas |
| Language | TypeScript | Type safety for the complex XML schema |
| Tree rendering | PixiJS v8 | WebGL-accelerated, handles 1500+ nodes |
| XML parsing | Browser `DOMParser` (client) or `fast-xml-parser` (server) | Zero deps on client |
| Zlib decompress | `pako` npm package | Browser-compatible zlib inflate |
| Styling | Tailwind CSS + custom CSS for PoE tooltip frames | |
| Short URL backend | Cloudflare Workers + Cloudflare KV | Zero cold start, free tier sufficient |
| Item icon source | RePoE `base_items.json` → CDN redirect | No API calls at runtime |

## Repository Structure

```
pob-codes/
  app/
    page.tsx                  # Landing / paste-a-code page
    [slug]/
      page.tsx                # Build viewer page (SSR: decode + parse)
      PassiveTreeCanvas.tsx   # Client component (PixiJS)
    api/
      save/route.ts           # POST: store build code, return slug
  lib/
    decode.ts                 # base64url → pako inflate → string
    parse-xml.ts              # XML → BuildData typed object
    item-parser.ts            # Raw PoE item text → structured Item object
    item-icons.ts             # base type name → CDN URL (uses RePoE data)
    tree-coords.ts            # node orbit/orbitIndex → pixel x,y
  data/
    base_items.json           # Vendored from RePoE (updated per patch)
    skilltree/
      data.json               # Vendored from grindinggear/skilltree-export
      assets/                 # All sprite sheets (vendored)
  components/
    ItemTooltip.tsx
    SkillsPanel.tsx
    StatsPanel.tsx
    BuildHeader.tsx
  types/
    build.ts                  # TypeScript interfaces for parsed build data
```

## Implementation Steps

Each step has its own detailed document. They are ordered by dependency — implement in order.

| Step | Document | Depends On |
|---|---|---|
| 1 | [01-build-decoding.md](01-build-decoding.md) | nothing |
| 2 | [02-xml-parsing.md](02-xml-parsing.md) | Step 1 |
| 3 | [03-passive-tree.md](03-passive-tree.md) | Step 2 |
| 4 | [04-item-parsing.md](04-item-parsing.md) | Step 2 |
| 5 | [05-item-icons.md](05-item-icons.md) | Step 4 |
| 6 | [06-skills-gems.md](06-skills-gems.md) | Step 2 |
| 7 | [07-build-stats.md](07-build-stats.md) | Step 2 |
| 8 | [08-url-storage.md](08-url-storage.md) | Step 1 |
| 9 | [09-ui-styling.md](09-ui-styling.md) | Steps 3–7 |

## Key Constraints

- **No runtime API calls to GGG or trade APIs** for item icons. All icon resolution is done
  via static data (RePoE JSON vendored into the repo) mapped to CDN URLs.
- **No stat recalculation.** All numeric stats come directly from `<PlayerStat>` XML nodes
  that PoB pre-computed and embedded in the build string.
- **Fully client-side decode.** The build string is decoded in the browser; the server only
  stores/retrieves the raw code string for short URLs.

## External Data Sources to Vendor

Before starting implementation, download and commit these into `data/`:

1. **Passive tree data + sprites**
   - Repo: `https://github.com/grindinggear/skilltree-export`
   - Files needed: `data.json`, entire `assets/` folder
   - Update cadence: each PoE patch

2. **Base item data (for icon paths)**
   - Repo: `https://github.com/brather1ng/RePoE` (or lvlvllvlvllvlvl fork for latest)
   - File: `RePoE/data/base_items.json`
   - Update cadence: each PoE patch

Both are committed to the repo so the app has zero runtime data dependencies.
