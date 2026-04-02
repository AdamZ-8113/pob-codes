# Step 3 — Passive Skill Tree Rendering

## Goal

Render an interactive, zoomable/pannable passive skill tree canvas showing allocated nodes
highlighted, using only official GGG-provided data and sprites.

## Data Sources

All data is vendored — no runtime downloads.

### 1. Tree JSON

- Source: `https://github.com/grindinggear/skilltree-export`
- File: `data.json` → vendor to `data/skilltree/data.json`
- Also vendor: `alternate.json` (for alternate tree / Ruthless support if desired)

### 2. Sprite Sheets

All in the `assets/` folder of that same repo. Vendor the entire folder to
`data/skilltree/assets/`. In the Next.js app, place them in `public/skilltree/assets/` so
they're served as static files.

| File pattern | Content |
|---|---|
| `skills-0.jpg` … `skills-4.jpg` | Node icons (active/allocated state). Sprite sheets. |
| `skills-disabled-0.jpg` … `skills-disabled-4.jpg` | Node icons (unallocated). |
| `frame-0.png` … `frame-4.png` | Node border frames (normal, notable, keystone, etc.) |
| `line-0.png` … `line-4.png` | Connection line segments between nodes |
| `group-background-0.png` … `group-background-4.png` | Circular group halos |
| `background-0.png` … `background-4.png` | Full tree background layers |
| `jewel-0.png` … `jewel-4.png` | Jewel socket rings |
| `jewel-radius.png` | Radius overlay for jewels |
| `mastery-*.png` | Mastery node states |
| `ascendancy-0.webp` … | Ascendancy backgrounds |

The numbered variants (0–4) are different resolutions. Use index `1` as the default
(medium resolution). Index `0` is lowest, `4` is highest.

## data.json Structure

```json
{
  "tree": "Default",
  "classes": [
    {
      "name": "Scion",
      "baseStr": 20, "baseDex": 20, "baseInt": 20,
      "ascendancies": [
        {
          "id": "Ascendant",
          "name": "Ascendant",
          "flavourText": "...",
          "nodes": { "12345": { ... } }
        }
      ]
    },
    ...6 more classes
  ],
  "groups": {
    "1": {
      "x": 0, "y": 0,
      "orbits": [0, 1, 2],
      "background": { "image": "PSGroupBackground1" },
      "nodes": ["12345", "67890"]
    },
    ...
  },
  "nodes": {
    "12345": {
      "skill": 12345,
      "name": "Thick Skin",
      "stats": ["+10 to maximum Life"],
      "icon": "Art/2DItems/Skills/PassiveSkillIcons/...",
      "isKeystone": false,
      "isNotable": false,
      "isMastery": false,
      "isAscendancyStart": false,
      "isJewelSocket": false,
      "orbit": 2,
      "orbitIndex": 3,
      "group": "6",
      "out": ["67890"],
      "in": ["11111"],
      "reminderText": [],
      "flavourText": []
    },
    ...
  },
  "min_x": -7000, "min_y": -7000,
  "max_x": 7000,  "max_y": 7000,
  "sprites": {
    "normalActive": { "filename": "skills-1.jpg", "coords": { "Art/2DItems/...": { "x": 0, "y": 0, "w": 48, "h": 48 } } },
    "normalInactive": { ... },
    "notableActive": { ... },
    "notableInactive": { ... },
    "keystoneActive": { ... },
    "keystoneInactive": { ... },
    "mastery": { ... },
    "frame": { ... }
  }
}
```

The `sprites` object maps sprite sheet name → filename + sprite coordinate atlas.

## Node Coordinate Calculation

Nodes do not have absolute `x/y` in the node object — they use a polar coordinate system
relative to their group center.

```typescript
// lib/tree-coords.ts

const ORBIT_RADII = [0, 82, 162, 335, 493, 662, 846];

const ORBIT_NODE_COUNT: Record<number, number[]> = {
  0: [],
  1: [0],
  6: [0, 60, 120, 180, 240, 300],
  12: [0, 30, 60, 90, 120, 150, 180, 210, 240, 270, 300, 330],
  16: [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5, 180, 202.5, 225, 247.5, 270, 292.5, 315, 337.5],
};

// Returns angles array for a given number of nodes in that orbit
function getOrbitAngles(nodeCount: number): number[] {
  if (ORBIT_NODE_COUNT[nodeCount]) return ORBIT_NODE_COUNT[nodeCount];
  // Fallback: evenly distributed
  return Array.from({ length: nodeCount }, (_, i) => (360 / nodeCount) * i);
}

export interface NodePosition {
  x: number;
  y: number;
}

export function getNodePosition(
  node: { orbit: number; orbitIndex: number; group: string },
  groups: Record<string, { x: number; y: number; orbits: number[] }>
): NodePosition {
  const group = groups[node.group];
  if (!group) return { x: 0, y: 0 };

  const radius = ORBIT_RADII[node.orbit] ?? 0;
  if (radius === 0) return { x: group.x, y: group.y };

  // Total nodes in this orbit within this group
  const orbitCount = group.orbits.filter(o => o === node.orbit).length;
  // Actually orbit defines how many nodes on that ring globally; use orbitIndex + orbit size
  // The correct approach: number of positions for this orbit comes from the angles table
  const angles = getOrbitAngles(node.orbit <= 1 ? node.orbit : node.orbit === 2 ? 6 : node.orbit === 3 ? 12 : 16);
  const angleDeg = angles[node.orbitIndex] ?? (360 / 12) * node.orbitIndex;

  // PoB uses 0° = top, clockwise. Convert to standard math angles.
  const angleRad = ((angleDeg - 90) * Math.PI) / 180;

  return {
    x: group.x + radius * Math.cos(angleRad),
    y: group.y + radius * Math.sin(angleRad),
  };
}
```

> **Important**: The orbit angle mapping changed in patch 3.17 — orbits 2 and 3 went from 12
> to 16 nodes. The `data.json` from the GGG repo already accounts for this in the node data
> itself, but your angle lookup needs to match. Use the node count from the orbit definitions
> in `data.json`'s `constants` or `orbitRadii`/`skillsPerOrbit` arrays if present, rather
> than hardcoding.

## Rendering with PixiJS

Install:
```bash
npm install pixi.js
```

### Component: `components/PassiveTreeCanvas.tsx`

This is a `'use client'` component.

```typescript
'use client';
import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import type { PassiveSpec } from '@/types/build';
import treeData from '@/data/skilltree/data.json';
import { getNodePosition } from '@/lib/tree-coords';

interface Props {
  spec: PassiveSpec;
  className?: string;
}

export function PassiveTreeCanvas({ spec, className }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const app = new PIXI.Application();
    app.init({
      width: containerRef.current.clientWidth,
      height: containerRef.current.clientHeight,
      backgroundColor: 0x0a0a0a,
      antialias: true,
      resizeTo: containerRef.current,
    }).then(() => {
      containerRef.current!.appendChild(app.canvas);
      buildTree(app, spec);
    });

    return () => {
      app.destroy(true, { children: true });
    };
  }, [spec]);

  return <div ref={containerRef} className={className} style={{ width: '100%', height: '600px' }} />;
}
```

### Tree Build Function

```typescript
async function buildTree(app: PIXI.Application, spec: PassiveSpec) {
  // Root container — this is what we pan/zoom
  const stage = new PIXI.Container();
  app.stage.addChild(stage);

  // Layer order (back to front):
  const bgLayer = new PIXI.Container();       // background image
  const lineLayer = new PIXI.Container();      // connection lines
  const groupBgLayer = new PIXI.Container();   // group halos
  const nodeLayer = new PIXI.Container();      // node icons + frames
  const labelLayer = new PIXI.Container();     // node name labels (on hover)

  stage.addChild(bgLayer, lineLayer, groupBgLayer, nodeLayer, labelLayer);

  // Load sprite sheets (files are in /public/skilltree/assets/)
  const ASSET_BASE = '/skilltree/assets';
  const SPRITE_SCALE = 1; // use resolution index 1 sprites

  // Load all required textures
  await PIXI.Assets.load([
    `${ASSET_BASE}/skills-1.jpg`,
    `${ASSET_BASE}/skills-disabled-1.jpg`,
    `${ASSET_BASE}/frame-1.png`,
    `${ASSET_BASE}/background-1.png`,
    `${ASSET_BASE}/line-1.png`,
  ]);

  // Draw connections
  const graphics = new PIXI.Graphics();
  lineLayer.addChild(graphics);

  const nodes = treeData.nodes as Record<string, any>;
  const groups = treeData.groups as Record<string, any>;

  for (const [nodeIdStr, node] of Object.entries(nodes)) {
    const nodeId = parseInt(nodeIdStr, 10);
    const pos = getNodePosition(node, groups);

    // Draw lines to connected nodes
    for (const outId of (node.out ?? [])) {
      const targetNode = nodes[String(outId)];
      if (!targetNode) continue;
      const targetPos = getNodePosition(targetNode, groups);

      const isAllocated = spec.allocatedNodes.has(nodeId) &&
                          spec.allocatedNodes.has(parseInt(outId, 10));
      graphics.moveTo(pos.x, pos.y);
      graphics.lineTo(targetPos.x, targetPos.y);
      graphics.stroke({ width: 2, color: isAllocated ? 0xaf6025 : 0x303030 });
    }
  }

  // Draw nodes
  for (const [nodeIdStr, node] of Object.entries(nodes)) {
    const nodeId = parseInt(nodeIdStr, 10);
    const pos = getNodePosition(node, groups);
    const isAllocated = spec.allocatedNodes.has(nodeId);

    // Use appropriate sprite sheet coords from treeData.sprites
    const spriteKey = node.isKeystone ? (isAllocated ? 'keystoneActive' : 'keystoneInactive')
                    : node.isNotable  ? (isAllocated ? 'notableActive'  : 'notableInactive')
                    :                   (isAllocated ? 'normalActive'   : 'normalInactive');

    const spriteInfo = (treeData.sprites as any)[spriteKey];
    if (!spriteInfo) continue;

    const coords = spriteInfo.coords[node.icon];
    if (!coords) continue;

    const baseTexture = PIXI.Assets.get(`${ASSET_BASE}/${spriteInfo.filename}`);
    const texture = new PIXI.Texture({
      source: baseTexture,
      frame: new PIXI.Rectangle(coords.x, coords.y, coords.w, coords.h),
    });

    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    sprite.x = pos.x;
    sprite.y = pos.y;
    nodeLayer.addChild(sprite);

    // Hover tooltip (show node name + stats)
    sprite.eventMode = 'static';
    sprite.cursor = 'pointer';
    sprite.on('pointerover', () => showNodeTooltip(node, labelLayer));
    sprite.on('pointerout', () => clearTooltip(labelLayer));
  }

  // Pan + zoom
  setupPanZoom(app, stage, treeData);
}
```

### Pan and Zoom

```typescript
function setupPanZoom(app: PIXI.Application, stage: PIXI.Container, treeData: any) {
  // Center on the tree initially
  stage.x = app.screen.width / 2;
  stage.y = app.screen.height / 2;
  stage.scale.set(0.15); // start zoomed out to see the full tree

  let isDragging = false;
  let dragStart = { x: 0, y: 0 };
  let stageStart = { x: 0, y: 0 };

  app.canvas.addEventListener('mousedown', (e) => {
    isDragging = true;
    dragStart = { x: e.clientX, y: e.clientY };
    stageStart = { x: stage.x, y: stage.y };
  });

  app.canvas.addEventListener('mousemove', (e) => {
    if (!isDragging) return;
    stage.x = stageStart.x + (e.clientX - dragStart.x);
    stage.y = stageStart.y + (e.clientY - dragStart.y);
  });

  app.canvas.addEventListener('mouseup', () => { isDragging = false; });

  app.canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    const newScale = Math.min(2, Math.max(0.05, stage.scale.x * factor));

    // Zoom toward mouse position
    const mouseX = e.offsetX;
    const mouseY = e.offsetY;
    stage.x = mouseX - (mouseX - stage.x) * (newScale / stage.scale.x);
    stage.y = mouseY - (mouseY - stage.y) * (newScale / stage.scale.y);
    stage.scale.set(newScale);
  }, { passive: false });
}
```

## Ascendancy Nodes

Ascendancy nodes are stored within the `classes[n].ascendancies[m].nodes` object in the JSON,
NOT in the top-level `nodes` object. To render them:

1. Determine the character's ascendancy from `BuildData.ascendClassName`
2. Find the matching ascendancy in `treeData.classes`
3. Merge ascendancy nodes into the node rendering loop
4. Position them the same way (they have `orbit`, `orbitIndex`, `group`)

The ascendancy node cluster appears as a separate island connected to the main tree at the
class starting node.

## Highlighting Allocated Path

For a clean visual:
- **Unallocated nodes**: dim/desaturated (use `skills-disabled` sprite sheet, alpha 0.5)
- **Allocated nodes**: full color (use `skills` sprite sheet, full alpha)
- **Allocated connections**: gold/orange line (`0xaf6025`)
- **Unallocated connections**: dark grey line (`0x303030`)
- **Jewel sockets**: check `spec.jewelSockets` — render the item name/icon in the socket

## Mastery Nodes

Mastery nodes (`node.isMastery === true`) are rendered differently:
- They show a special mastery icon
- When allocated (`spec.masteryEffects.has(nodeId)`), show the selected effect text on hover
- Use the `mastery-*.png` sprite sheets for their visual state

## Performance Notes

- The full tree has ~1500 nodes. PixiJS handles this easily with WebGL.
- Use `PIXI.ParticleContainer` for the node sprites if you need extra performance.
- Consider using `PIXI.RenderTexture` to cache the unallocated tree background and only
  re-render allocated nodes on top.
- For the initial implementation, a simple flat container is fine.
