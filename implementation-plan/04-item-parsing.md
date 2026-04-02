# Step 4 — Item Text Parsing

## Goal

Parse the raw PoE item text (stored inside `<Item>` XML nodes) into a structured TypeScript
object. This powers both the item tooltip display (Step 5) and icon lookup (Step 5).

## The Raw Item Text Format

PoE item text is the same format as Ctrl+C in-game and the trade API `extended.text` field.
Sections are separated by `--------`. Fields within sections are newline-separated.

### Full Example (Rare Body Armour)

```
Rarity: RARE
Greed's Embrace
Vaal Regalia
--------
Quality: +20% (augmented)
Energy Shield: 600 (augmented)
--------
Requirements:
Level: 68
Int: 194
--------
Sockets: B-B-B B-B-B
--------
Item Level: 85
--------
+92 to maximum Energy Shield
+80 to maximum Life
+45% to Lightning Resistance
+38% to Cold Resistance
Regenerate 5 Life per second
```

### Full Example (Unique)

```
Rarity: UNIQUE
Shavronne's Wrappings
Occultist's Vestment
--------
Quality: +20% (augmented)
Energy Shield: 370 (augmented)
--------
Requirements:
Level: 62
Str: 109
Int: 94
--------
Sockets: B-B-B-B-B-B
--------
Item Level: 80
--------
+24% to Global Critical Strike Multiplier
+[100-150] to maximum Energy Shield  <-- variant display
Reflects 1 to 250 Lightning Damage to Melee Attackers
-1 Physical Damage taken from Attacks
Lightning Damage from Hits does not bypass Energy Shield
--------
Corrupted
```

### Implicit vs Explicit

The `--------` separators divide the item into sections. The number and order of sections
varies by item type. The typical order is:

1. Header (Rarity, Name, Base)
2. Properties (Quality, Damage/ES/Armour, APS, etc.)
3. Requirements
4. Sockets
5. Item Level
6. Enchantments (if any)
7. Scourge mods (if any, prefixed with specific markers)
8. Implicits
9. Explicits (crafted mods have "(crafted)" suffix)
10. Final flags: "Corrupted", "Mirrored", "Split", "Shaper Item", etc.

## TypeScript Types

Add to `types/build.ts`:

```typescript
export type Rarity = 'NORMAL' | 'MAGIC' | 'RARE' | 'UNIQUE' | 'GEM' | 'CURRENCY' | 'DIVINATION';

export interface SocketGroup {
  sockets: Array<'R' | 'G' | 'B' | 'W' | 'A' | 'D'>;  // A=Abyss, D=Delve
  linked: boolean;  // true if sockets in this group are linked
}

export interface ParsedItem {
  rarity: Rarity;
  name: string;           // Unique name or rare name (first line after Rarity)
  baseType: string;       // Base type line (second line, or same as name for normal/magic)
  quality?: number;
  itemLevel?: number;
  requirements: {
    level?: number;
    str?: number;
    dex?: number;
    int?: number;
  };
  sockets: SocketGroup[];
  implicitMods: string[];
  explicitMods: string[];
  enchantMods: string[];
  craftedMods: string[];
  scourgedMods: string[];
  fracturedMods: string[];
  corrupted: boolean;
  mirrored: boolean;
  split: boolean;
  synthesised: boolean;
  // Influences
  influences: Array<'shaper' | 'elder' | 'crusader' | 'redeemer' | 'hunter' | 'warlord'>;
  // For gems
  gemLevel?: number;
  gemQuality?: number;
  isVaalGem?: boolean;
  // Raw properties section lines (armour, ES, evasion, DPS, etc.)
  // These are displayed as-is; no need to parse them further for a viewer
  properties: string[];
}
```

## File to Create

`lib/item-parser.ts`

## Implementation

```typescript
// lib/item-parser.ts
import type { ParsedItem, Rarity, SocketGroup } from '@/types/build';

export function parseItemText(raw: string): ParsedItem {
  // Normalize line endings
  const text = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  // Split into sections by the divider
  const sections = text.split('\n--------\n');

  // Section 0: always the header
  const headerLines = sections[0].split('\n');

  const rarityLine = headerLines.find(l => l.startsWith('Rarity:')) ?? '';
  const rarity = parseRarity(rarityLine.replace('Rarity: ', '').trim());

  let name = '';
  let baseType = '';

  // Lines after "Rarity:" are name/base lines
  const nameLines = headerLines.filter(l => !l.startsWith('Rarity:') && l.trim() !== '');
  if (rarity === 'NORMAL' || rarity === 'MAGIC' || rarity === 'GEM' || rarity === 'CURRENCY' || rarity === 'DIVINATION') {
    // Single name line = name and base are the same
    name = nameLines[0] ?? '';
    baseType = nameLines[0] ?? '';
  } else {
    // RARE and UNIQUE have two lines: name, then base type
    name = nameLines[0] ?? '';
    baseType = nameLines[1] ?? nameLines[0] ?? '';
  }

  const item: ParsedItem = {
    rarity,
    name,
    baseType,
    requirements: {},
    sockets: [],
    implicitMods: [],
    explicitMods: [],
    enchantMods: [],
    craftedMods: [],
    scourgedMods: [],
    fracturedMods: [],
    corrupted: false,
    mirrored: false,
    split: false,
    synthesised: false,
    influences: [],
    properties: [],
  };

  // Process remaining sections
  let inExplicits = false;
  let passedImplicit = false;

  for (let i = 1; i < sections.length; i++) {
    const lines = sections[i].split('\n').map(l => l.trim()).filter(Boolean);

    for (const line of lines) {
      // Single-flag lines
      if (line === 'Corrupted') { item.corrupted = true; continue; }
      if (line === 'Mirrored') { item.mirrored = true; continue; }
      if (line === 'Split') { item.split = true; continue; }
      if (line === 'Synthesised Item') { item.synthesised = true; continue; }

      // Influence lines
      if (line === 'Shaper Item') { item.influences.push('shaper'); continue; }
      if (line === 'Elder Item') { item.influences.push('elder'); continue; }
      if (line === 'Crusader Item') { item.influences.push('crusader'); continue; }
      if (line === 'Redeemer Item') { item.influences.push('redeemer'); continue; }
      if (line === 'Hunter Item') { item.influences.push('hunter'); continue; }
      if (line === 'Warlord Item') { item.influences.push('warlord'); continue; }

      // Requirements section
      if (line === 'Requirements:') continue;
      if (line.startsWith('Level:') && !item.itemLevel) {
        const val = parseInt(line.replace('Level:', '').trim(), 10);
        if (!isNaN(val)) item.requirements.level = val;
        continue;
      }

      // Sockets
      if (line.startsWith('Sockets:')) {
        item.sockets = parseSockets(line.replace('Sockets:', '').trim());
        continue;
      }

      // Item level
      if (line.startsWith('Item Level:')) {
        item.itemLevel = parseInt(line.replace('Item Level:', '').trim(), 10);
        continue;
      }

      // Quality (in properties)
      if (line.startsWith('Quality:')) {
        const q = line.match(/\+?(\d+)%/);
        if (q) item.quality = parseInt(q[1], 10);
        item.properties.push(line);
        continue;
      }

      // Gem-specific
      if (line.startsWith('Level:') && rarity === 'GEM') {
        item.gemLevel = parseInt(line.replace('Level:', '').trim(), 10);
        item.properties.push(line);
        continue;
      }

      // Enchantment marker
      if (line.includes('(enchant)')) {
        item.enchantMods.push(line.replace(' (enchant)', ''));
        continue;
      }

      // Crafted mod marker
      if (line.includes('(crafted)')) {
        item.craftedMods.push(line.replace(' (crafted)', ''));
        continue;
      }

      // Scourge mods
      if (line.includes('(scourge)')) {
        item.scourgedMods.push(line.replace(' (scourge)', ''));
        continue;
      }

      // Fractured mods
      if (line.includes('(fractured)')) {
        item.fracturedMods.push(line.replace(' (fractured)', ''));
        continue;
      }

      // Everything else in this section: try to classify as properties, implicits, or explicits.
      // Heuristic: property lines contain colons (e.g. "Energy Shield: 600")
      // Mod lines are free-form text starting with + or a word
      if (line.includes(':') && !line.startsWith('+') && !line.startsWith('-')) {
        item.properties.push(line);
      } else {
        // First non-property section after item level = implicits (1 section worth)
        // After that = explicits. This is a simplification — see note below.
        item.explicitMods.push(line);
      }
    }
  }

  return item;
}

function parseRarity(str: string): Rarity {
  switch (str.toUpperCase()) {
    case 'NORMAL': return 'NORMAL';
    case 'MAGIC': return 'MAGIC';
    case 'RARE': return 'RARE';
    case 'UNIQUE': return 'UNIQUE';
    case 'GEM': return 'GEM';
    case 'CURRENCY': return 'CURRENCY';
    case 'DIVINATION CARD': return 'DIVINATION';
    default: return 'NORMAL';
  }
}

function parseSockets(socketStr: string): SocketGroup[] {
  // Format: "R-G-B B-B R" — groups separated by spaces, sockets within group by -
  return socketStr.split(' ').map(group => ({
    linked: group.includes('-'),
    sockets: group.split('-').map(s => s as 'R' | 'G' | 'B' | 'W' | 'A' | 'D'),
  }));
}
```

## Notes on Implicit Detection

The implicit/explicit boundary is the trickiest part of PoE item text parsing. The full rules:

- Items have exactly 0 or 1 implicit sections (before the first explicit separator)
- The number of implicits is encoded in the game data for each base type
- For a viewer, the simplification of "first mod-like section = implicit, rest = explicit"
  is acceptable for display purposes — users can read the raw text anyway
- If you want accuracy, cross-reference the base type's implicit count from RePoE's
  `base_items.json` (`implicits` array)

## Usage

```typescript
import { parseItemText } from '@/lib/item-parser';
import type { BuildData } from '@/types/build';

// Parse all equipped items in the active item set
function getParsedEquippedItems(build: BuildData) {
  const activeSet = build.itemSets.find(s => s.id === build.activeItemSetId);
  if (!activeSet) return [];

  return activeSet.slots
    .filter(slot => slot.itemId > 0)
    .map(slot => {
      const rawItem = build.rawItems.get(slot.itemId);
      if (!rawItem) return null;
      return {
        slot: slot.name,
        item: parseItemText(rawItem.rawText),
      };
    })
    .filter(Boolean);
}
```
