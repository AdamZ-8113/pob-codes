# Step 5 — Item Icons & Tooltips

## Goal

Display each equipped item with:
1. Its icon image (sourced from RePoE data → GGG CDN, no API calls)
2. A styled tooltip replicating PoE's in-game item frame

## Icon Strategy

### How It Works

RePoE's `base_items.json` contains a `visual_identity.dds_file` field for every base item type:

```json
{
  "Metadata/Items/Armours/BodyArmours/BodyInt6": {
    "name": "Occultist's Vestment",
    "visual_identity": {
      "dds_file": "Art/2DItems/Armours/BodyArmours/BodyInt6.dds",
      "id": "BodyInt6"
    },
    ...
  }
}
```

GGG's CDN serves these images as PNG (not DDS) at:
```
https://web.poecdn.com/image/{path_without_extension}.png
```

So `Art/2DItems/Armours/BodyArmours/BodyInt6.dds` becomes:
```
https://web.poecdn.com/image/Art/2DItems/Armours/BodyArmours/BodyInt6.png
```

No API call. No authentication. Just a static URL constructed from the base type name.

### Unique Items

Unique items share base art with their base type by default. Most unique items use the same
icon as their base (e.g. "Shavronne's Wrappings" uses the Occultist's Vestment icon).

Some uniques have custom art. Handling this is a stretch goal — for v1, using the base type
art is acceptable and what most community tools do.

### Gem Icons

Gems are stored as items in PoB. The base type of a gem item IS the gem name (e.g. "Fireball").
RePoE's `gems.json` (or `base_items.json` under the `Metadata/Items/Gems/` path) has the
icon path for each gem.

Alternatively, gems can be identified by the `nameSpec` field in the `<Gem>` XML element and
displayed as text without an icon for v1.

## Files to Create / Modify

- `data/base_items.json` — Vendored RePoE file
- `lib/item-icons.ts` — Icon URL lookup function
- `components/ItemTooltip.tsx` — Tooltip component
- `components/ItemGrid.tsx` — Character equipment layout

## Vendoring RePoE Data

```bash
# In your project root, fetch the RePoE base_items.json
# Source: https://github.com/brather1ng/RePoE or https://github.com/lvlvllvlvllvlvl/RePoE
# Place at: data/base_items.json

# The file is ~3MB — acceptable to vendor directly.
# Update it when a new PoE patch releases base type changes.
```

Build a lookup index from it at startup (or build time):

```typescript
// lib/item-icons.ts
import rawBaseItems from '@/data/base_items.json';

// Build a name → dds_file map at module load time
const BASE_ITEM_BY_NAME = new Map<string, string>();

for (const [_key, item] of Object.entries(rawBaseItems as Record<string, any>)) {
  if (item.name && item.visual_identity?.dds_file) {
    BASE_ITEM_BY_NAME.set(item.name.toLowerCase(), item.visual_identity.dds_file);
  }
}

const CDN_BASE = 'https://web.poecdn.com/image/';

/**
 * Returns the CDN URL for a base item type name.
 * e.g. "Occultist's Vestment" → "https://web.poecdn.com/image/Art/2DItems/..."
 */
export function getItemIconUrl(baseTypeName: string): string | null {
  const ddsFile = BASE_ITEM_BY_NAME.get(baseTypeName.toLowerCase());
  if (!ddsFile) return null;

  // Strip .dds extension and prepend CDN base
  const path = ddsFile.replace(/\.dds$/i, '.png');
  return `${CDN_BASE}${path}`;
}

/**
 * Given a ParsedItem, returns the best icon URL available.
 * Falls back to baseType if name lookup fails (for rares/normals).
 */
export function getIconForItem(item: { name: string; baseType: string; rarity: string }): string | null {
  // For unique items, try the name first (some uniques have their own entry)
  if (item.rarity === 'UNIQUE') {
    const byName = getItemIconUrl(item.name);
    if (byName) return byName;
  }
  // Fall back to base type (works for all rarities)
  return getItemIconUrl(item.baseType);
}
```

## Item Tooltip Component

The PoE item tooltip is a styled box with a colored header bar based on rarity.

```
Rarity colors:
  NORMAL   → white text, grey frame     (#c8c8c8 header bg)
  MAGIC    → blue text, blue frame      (#8888ff header bg)
  RARE     → yellow text, yellow frame  (#ffff77 header bg)
  UNIQUE   → brown text, brown frame    (#af6025 header bg)
  GEM      → teal text, teal frame      (#1ba29b header bg)
  CURRENCY → gold text, gold frame      (#aa9e82 header bg)
```

```tsx
// components/ItemTooltip.tsx
import type { ParsedItem } from '@/types/build';
import { getIconForItem } from '@/lib/item-icons';

const RARITY_COLORS: Record<string, { header: string; text: string; border: string }> = {
  NORMAL:     { header: '#3d3d3d', text: '#c8c8c8', border: '#696969' },
  MAGIC:      { header: '#1a1a4a', text: '#8888ff', border: '#3333cc' },
  RARE:       { header: '#2a2500', text: '#ffff77', border: '#888800' },
  UNIQUE:     { header: '#2a1400', text: '#af6025', border: '#7a4514' },
  GEM:        { header: '#001a18', text: '#1ba29b', border: '#166661' },
  CURRENCY:   { header: '#1a1600', text: '#aa9e82', border: '#7a6e52' },
  DIVINATION: { header: '#0d0d1a', text: '#0099bd', border: '#006f8a' },
};

interface Props {
  item: ParsedItem;
  slotName: string;
}

export function ItemTooltip({ item, slotName }: Props) {
  const colors = RARITY_COLORS[item.rarity] ?? RARITY_COLORS.NORMAL;
  const iconUrl = getIconForItem(item);

  return (
    <div className="item-tooltip" style={{ borderColor: colors.border, backgroundColor: '#0d0d0d' }}>
      {/* Header */}
      <div className="item-header" style={{ backgroundColor: colors.header, color: colors.text }}>
        <div className="item-name">{item.name}</div>
        {item.name !== item.baseType && (
          <div className="item-base">{item.baseType}</div>
        )}
      </div>

      {/* Icon */}
      {iconUrl && (
        <div className="item-icon-container">
          <img src={iconUrl} alt={item.name} className="item-icon" loading="lazy" />
        </div>
      )}

      <Divider />

      {/* Properties (Quality, ES, Armour, DPS, etc.) */}
      {item.properties.length > 0 && (
        <>
          {item.properties.map((p, i) => <PropertyLine key={i} text={p} />)}
          <Divider />
        </>
      )}

      {/* Requirements */}
      {Object.keys(item.requirements).length > 0 && (
        <>
          <div className="item-section">
            <span className="prop-label">Requires</span>
            {item.requirements.level && <span> Level {item.requirements.level}</span>}
            {item.requirements.str && <span>, <span className="req-str">{item.requirements.str} Str</span></span>}
            {item.requirements.dex && <span>, <span className="req-dex">{item.requirements.dex} Dex</span></span>}
            {item.requirements.int && <span>, <span className="req-int">{item.requirements.int} Int</span></span>}
          </div>
          <Divider />
        </>
      )}

      {/* Sockets */}
      {item.sockets.length > 0 && (
        <>
          <SocketDisplay sockets={item.sockets} />
          <Divider />
        </>
      )}

      {/* Item Level */}
      {item.itemLevel && (
        <>
          <div className="item-section"><span className="prop-label">Item Level:</span> {item.itemLevel}</div>
          <Divider />
        </>
      )}

      {/* Enchants */}
      {item.enchantMods.map((m, i) => (
        <div key={i} className="mod-line mod-enchant">{m}</div>
      ))}
      {item.enchantMods.length > 0 && <Divider />}

      {/* Implicits */}
      {item.implicitMods.map((m, i) => (
        <div key={i} className="mod-line mod-implicit">{m}</div>
      ))}
      {item.implicitMods.length > 0 && <Divider />}

      {/* Explicits */}
      {item.explicitMods.map((m, i) => {
        const isCrafted = item.craftedMods.includes(m);
        const isFractured = item.fracturedMods.includes(m);
        return (
          <div key={i} className={`mod-line ${isCrafted ? 'mod-crafted' : isFractured ? 'mod-fractured' : 'mod-explicit'}`}>
            {m}
          </div>
        );
      })}

      {/* Corrupted */}
      {item.corrupted && <div className="item-corrupted">Corrupted</div>}
      {item.mirrored && <div className="item-mirrored">Mirrored</div>}
    </div>
  );
}

function Divider() {
  return <div className="item-divider" />;
}

function PropertyLine({ text }: { text: string }) {
  // Bold the label part (before the colon), color values blue if augmented
  const isAugmented = text.includes('(augmented)');
  const colonIdx = text.indexOf(':');
  if (colonIdx === -1) return <div className="prop-line">{text}</div>;

  const label = text.slice(0, colonIdx + 1);
  const value = text.slice(colonIdx + 1).replace(' (augmented)', '').trim();

  return (
    <div className="prop-line">
      <span className="prop-label">{label}</span>{' '}
      <span className={isAugmented ? 'value-augmented' : 'value-normal'}>{value}</span>
      {isAugmented && <span className="augmented-marker"> (augmented)</span>}
    </div>
  );
}

function SocketDisplay({ sockets }: { sockets: Array<{ sockets: string[]; linked: boolean }> }) {
  const SOCKET_COLORS: Record<string, string> = {
    R: '#c03030', G: '#30a030', B: '#3030c0', W: '#b0b0b0', A: '#2a2a2a', D: '#50b0c0',
  };
  return (
    <div className="socket-display">
      {sockets.map((group, gi) => (
        <span key={gi} className="socket-group">
          {group.sockets.map((s, si) => (
            <>
              <span key={si} className="socket" style={{ backgroundColor: SOCKET_COLORS[s] ?? '#888' }} />
              {si < group.sockets.length - 1 && group.linked && <span className="socket-link" />}
            </>
          ))}
          {gi < sockets.length - 1 && <span className="socket-separator" />}
        </span>
      ))}
    </div>
  );
}
```

## CSS for Tooltips

```css
/* In globals.css or a tooltip.module.css */
.item-tooltip {
  min-width: 280px;
  max-width: 380px;
  border: 1px solid;
  font-family: 'Fontin SmallCaps', 'Fontin', serif;
  font-size: 14px;
  color: #c8c8c8;
  padding: 0;
  position: relative;
}

.item-header {
  padding: 6px 12px;
  text-align: center;
}

.item-name { font-size: 16px; }
.item-base { font-size: 13px; opacity: 0.85; }

.item-divider {
  height: 1px;
  background: linear-gradient(to right, transparent, #555, transparent);
  margin: 4px 0;
}

.mod-line { padding: 1px 12px; }
.mod-explicit { color: #88f; }
.mod-implicit { color: #8f8; }
.mod-crafted  { color: #55bbff; }
.mod-fractured { color: #e0c; }
.mod-enchant  { color: #b4b4ff; }

.value-augmented { color: #88f; }
.value-normal    { color: #c8c8c8; }
.prop-label      { color: #c8c8c8; }
.augmented-marker { color: #88f; font-size: 11px; }

.item-corrupted { color: #d20000; padding: 4px 12px; }
.item-mirrored  { color: #aaddff; padding: 4px 12px; }

.socket { display: inline-block; width: 16px; height: 16px; border-radius: 50%; border: 1px solid #888; }
.socket-link { display: inline-block; width: 6px; height: 2px; background: #888; vertical-align: middle; }
.socket-group { display: inline-flex; align-items: center; gap: 2px; }
.socket-separator { display: inline-block; width: 8px; }
.socket-display { padding: 4px 12px; }
```

## Character Equipment Layout

```tsx
// components/ItemGrid.tsx
const SLOT_LAYOUT = [
  // [slotName, gridColumn, gridRow]
  ['Helm',        2, 1],
  ['Amulet',      3, 1],
  ['Weapon 1',    1, 2],
  ['Body Armour', 2, 2],
  ['Weapon 2',    3, 2],
  ['Ring 1',      1, 3],
  ['Gloves',      2, 3], // actually gloves is col1 row3 in poe layout - adjust to taste
  ['Ring 2',      3, 3],
  ['Belt',        2, 4],
  ['Boots',       2, 5],
  ['Flask 1',     1, 5],
  ['Flask 2',     2, 5], // flasks usually in a row below
];

// Each slot renders a small item icon; click to open full tooltip
```

## Font Note

PoE uses "Fontin SmallCaps" as its UI font. You can include it as a web font from a CDN or
serve it locally. It's freely available and improves visual fidelity significantly.
A fallback of `Georgia, serif` is acceptable for v1.
