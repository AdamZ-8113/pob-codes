# Step 9 — UI Layout & Styling

## Goal

Assemble all components into a cohesive page that resembles PoB Codes' layout and feels native
to Path of Exile's dark fantasy aesthetic.

## Overall Page Layout

```
┌─────────────────────────────────────────────────────────┐
│  HEADER: Class | Ascendancy | Level | Build Name (notes) │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────┐  ┌──────────────────────────┐  ┌────────┐ │
│  │  STATS   │  │   PASSIVE TREE (canvas)  │  │ ITEMS  │ │
│  │  PANEL   │  │                          │  │  GRID  │ │
│  │          │  │  (zoomable/pannable)     │  │        │ │
│  │ Offense  │  │                          │  │  Helm  │ │
│  │ Defense  │  │                          │  │  Body  │ │
│  │          │  │                          │  │  etc.  │ │
│  └──────────┘  └──────────────────────────┘  └────────┘ │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │              SKILLS PANEL                         │   │
│  │  Main Skill: Fireball L20 Q20 / Spell Echo ...    │   │
│  │  Aura Setup: Herald of Ash / Anger / ...          │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

On mobile (< 768px): single column, tree renders smaller, items collapse to a row of icons.

## Color Palette

```css
:root {
  /* Background */
  --bg-page:       #0a0a0a;
  --bg-panel:      #111111;
  --bg-panel-alt:  #1a1a1a;
  --bg-header:     #0d0d0d;

  /* Borders */
  --border-subtle: #222222;
  --border-panel:  #2a2a2a;
  --border-accent: #3d2b0a;

  /* Text */
  --text-primary:  #c8c8c8;
  --text-secondary:#888888;
  --text-heading:  #af8040;
  --text-value:    #ffffff;

  /* PoE accent colors */
  --poe-gold:      #af8040;
  --poe-orange:    #af6025;
  --poe-teal:      #1ba29b;
  --poe-blue:      #8888ff;

  /* Rarity */
  --rarity-normal: #c8c8c8;
  --rarity-magic:  #8888ff;
  --rarity-rare:   #ffff77;
  --rarity-unique: #af6025;
  --rarity-gem:    #1ba29b;
}
```

## Typography

```css
@import url('https://fonts.googleapis.com/css2?family=Fontin+SmallCaps&display=swap');
/* If Fontin is not on Google Fonts, serve it locally as a woff2 */

body {
  font-family: 'Fontin SmallCaps', 'EB Garamond', Georgia, serif;
  background: var(--bg-page);
  color: var(--text-primary);
  margin: 0;
}

/* Fallback stack that looks reasonable without Fontin */
.stat-value, .gem-name, .mod-line {
  font-family: 'Fontin SmallCaps', Georgia, serif;
}
```

## Build Header Component

```tsx
// components/BuildHeader.tsx
import type { BuildData } from '@/types/build';

export function BuildHeader({ build }: { build: BuildData }) {
  const mainActiveSkill = getMainActiveSkillName(build);

  return (
    <header className="build-header">
      <div className="build-header-main">
        <h1 className="build-title">
          {build.ascendClassName || build.className}
          <span className="build-level">Level {build.level}</span>
        </h1>
        {mainActiveSkill && (
          <div className="build-subtitle">{mainActiveSkill}</div>
        )}
      </div>
      <div className="build-meta">
        <span>Version: {build.targetVersion.replace('_', '.')}</span>
        {build.bandit !== 'None' && <span>Bandit: {build.bandit}</span>}
      </div>
    </header>
  );
}

function getMainActiveSkillName(build: BuildData): string | null {
  const activeSet = build.skillSets.find(s => s.id === build.activeSkillSetId);
  if (!activeSet) return null;
  const mainGroup = activeSet.groups[build.mainSocketGroup - 1];
  if (!mainGroup) return null;
  const mainGem = mainGroup.gems[mainGroup.mainActiveSkill - 1];
  return mainGem?.nameSpec ?? null;
}
```

```css
.build-header {
  background: linear-gradient(to bottom, #1a1000, #0d0d0d);
  border-bottom: 2px solid var(--poe-orange);
  padding: 16px 24px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.build-title {
  font-size: 24px;
  color: var(--poe-gold);
  margin: 0;
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.build-level {
  font-size: 14px;
  color: var(--text-secondary);
}

.build-subtitle {
  color: var(--text-secondary);
  font-size: 14px;
  margin-top: 4px;
}

.build-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: var(--text-secondary);
}
```

## Landing Page (Code Input)

```tsx
// app/page.tsx (simplified)
export default function LandingPage() {
  return (
    <main className="landing">
      <div className="landing-hero">
        <h1>PoB Build Viewer</h1>
        <p>Paste a Path of Building code to visualize your build.</p>
        <BuildCodeInput />
      </div>
    </main>
  );
}
```

```tsx
// components/BuildCodeInput.tsx
'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { decodeBuildCode } from '@/lib/decode';

export function BuildCodeInput() {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) return;

    try {
      decodeBuildCode(trimmed); // validate
    } catch {
      setError('Invalid build code. Please copy it again from Path of Building.');
      return;
    }

    // Option 1: redirect with code in URL (no backend needed)
    router.push(`/?code=${encodeURIComponent(trimmed)}`);

    // Option 2: save to backend and redirect to short URL
    // saveBuild(trimmed).then(({ slug }) => router.push(`/builds/${slug}`));
  }

  return (
    <form onSubmit={handleSubmit} className="code-form">
      <textarea
        value={code}
        onChange={e => setCode(e.target.value)}
        placeholder="Paste PoB code here..."
        className="code-input"
        rows={4}
      />
      {error && <div className="code-error">{error}</div>}
      <button type="submit" className="code-submit">View Build</button>
    </form>
  );
}
```

## Full Page Layout Component

```tsx
// components/BuildViewer.tsx
'use client';
import type { BuildData } from '@/types/build';
import { BuildHeader } from './BuildHeader';
import { StatsPanel } from './StatsPanel';
import { PassiveTreeCanvas } from './PassiveTreeCanvas';
import { ItemGrid } from './ItemGrid';
import { SkillsPanel } from './SkillsPanel';

export function BuildViewer({ build }: { build: BuildData }) {
  return (
    <div className="build-viewer">
      <BuildHeader build={build} />

      <div className="build-body">
        <div className="build-top-row">
          <StatsPanel build={build} />
          <PassiveTreeCanvas
            spec={build.passiveSpec}
            className="tree-canvas-container"
          />
          <ItemGrid build={build} />
        </div>

        <SkillsPanel build={build} />
      </div>
    </div>
  );
}
```

```css
.build-viewer {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.build-body {
  flex: 1;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.build-top-row {
  display: grid;
  grid-template-columns: 220px 1fr 200px;
  gap: 12px;
  align-items: start;
}

.tree-canvas-container {
  height: 560px;
  border: 1px solid var(--border-panel);
  border-radius: 4px;
  overflow: hidden;
}

/* Responsive */
@media (max-width: 1024px) {
  .build-top-row {
    grid-template-columns: 1fr 1fr;
  }
  .tree-canvas-container {
    grid-column: 1 / -1;
    height: 400px;
  }
}

@media (max-width: 640px) {
  .build-top-row {
    grid-template-columns: 1fr;
  }
}
```

## Item Grid Layout

The character doll layout (equipment slots positioned like the in-game inventory):

```css
.item-grid {
  display: grid;
  grid-template-columns: repeat(3, 60px);
  grid-template-rows: repeat(6, 60px);
  gap: 4px;
}

/* Slot positions (col/row, 1-indexed) */
.slot-helm         { grid-column: 2; grid-row: 1; }
.slot-amulet       { grid-column: 3; grid-row: 1; }
.slot-weapon-1     { grid-column: 1; grid-row: 2; }
.slot-body-armour  { grid-column: 2; grid-row: 2; }
.slot-weapon-2     { grid-column: 3; grid-row: 2; }
.slot-ring-1       { grid-column: 1; grid-row: 3; }
.slot-gloves       { grid-column: 2; grid-row: 3; }
.slot-ring-2       { grid-column: 3; grid-row: 3; }
.slot-belt         { grid-column: 2; grid-row: 4; }
.slot-boots        { grid-column: 2; grid-row: 5; }
.slot-flask-1      { grid-column: 1; grid-row: 6; }
.slot-flask-2      { grid-column: 2; grid-row: 6; }
/* etc. */

.item-slot {
  width: 60px;
  height: 60px;
  border: 1px solid #2a2a2a;
  background: #0d0d0d;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  position: relative;
}

.item-slot img {
  max-width: 52px;
  max-height: 52px;
  object-fit: contain;
}

.item-slot:hover {
  border-color: #555;
}
```

## Tooltip Positioning

Use a floating tooltip on hover over item slots. A simple approach:

```tsx
// Use a fixed-position portal for the tooltip to avoid overflow clipping
import { createPortal } from 'react-dom';

function ItemSlot({ slot, build }: { slot: ItemSlot; build: BuildData }) {
  const [tooltip, setTooltip] = useState<{ x: number; y: number } | null>(null);
  const rawItem = build.rawItems.get(slot.itemId);
  const parsedItem = rawItem ? parseItemText(rawItem.rawText) : null;
  const iconUrl = parsedItem ? getIconForItem(parsedItem) : null;

  return (
    <div
      className="item-slot"
      onMouseEnter={e => setTooltip({ x: e.clientX, y: e.clientY })}
      onMouseLeave={() => setTooltip(null)}
    >
      {iconUrl && <img src={iconUrl} alt={parsedItem?.name} />}
      {tooltip && parsedItem && createPortal(
        <div
          className="item-tooltip-float"
          style={{ position: 'fixed', left: tooltip.x + 16, top: tooltip.y, zIndex: 9999 }}
        >
          <ItemTooltip item={parsedItem} slotName={slot.name} />
        </div>,
        document.body
      )}
    </div>
  );
}
```

## Notes Section

If `build.notes` is non-empty, render it below the skills panel:

```tsx
{build.notes && (
  <section className="build-notes">
    <h2>Notes</h2>
    <pre className="notes-text">{build.notes}</pre>
  </section>
)}
```

```css
.build-notes { margin-top: 16px; }
.notes-text {
  background: #111;
  border: 1px solid #2a2a2a;
  padding: 12px;
  color: #aaa;
  font-family: inherit;
  white-space: pre-wrap;
  font-size: 13px;
}
```
