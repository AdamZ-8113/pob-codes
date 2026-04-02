# Step 2 — XML Parsing

## Goal

Parse the decoded XML string into a typed TypeScript object (`BuildData`) that all subsequent
rendering steps consume.

## XML Structure Reference

The root element is `<PathOfBuilding>`. These are the child sections you need:

```xml
<PathOfBuilding>
  <Build level="95" className="Witch" ascendClassName="Elementalist"
         targetVersion="3_0" bandit="None"
         pantheonMajorGod="TheBrine" pantheonMinorGod="Shakari"
         mainSocketGroup="1" viewMode="ITEMS">
    <PlayerStat stat="Life" value="4521"/>
    <PlayerStat stat="Mana" value="803"/>
    <PlayerStat stat="EnergyShield" value="0"/>
    <PlayerStat stat="AverageDamage" value="1234567.89"/>
    <PlayerStat stat="TotalDPS" value="1234567.89"/>
    <!-- many more PlayerStat entries -->
    <MinionStat stat="..." value="..."/>
    <FullDPSSkill name="Fireball"/>
  </Build>

  <Skills activeSkillSet="1" defaultGemLevel="20" defaultGemQuality="20">
    <SkillSet id="1" title="Default">
      <Skill enabled="true" slot="Weapon 1" mainActiveSkill="1" label="Main Skill">
        <Gem nameSpec="Fireball" skillId="Fireball" gemId="..." level="20"
             quality="20" enabled="true" variantId="Default"/>
        <Gem nameSpec="Spell Echo Support" level="20" quality="20" enabled="true"/>
      </Skill>
    </SkillSet>
  </Skills>

  <Items activeItemSet="1">
    <Item id="1" variant="1">
Rarity: UNIQUE
Shavronne's Wrappings
Occultist's Vestment
...raw item text...
    </Item>
    <ItemSet id="1" title="Default" useSecondWeaponSet="false">
      <Slot name="Helm" itemId="2"/>
      <Slot name="Body Armour" itemId="1"/>
      <Slot name="Gloves" itemId="3"/>
      <Slot name="Boots" itemId="4"/>
      <Slot name="Weapon 1" itemId="5"/>
      <Slot name="Weapon 2" itemId="0"/>   <!-- 0 = empty -->
      <Slot name="Ring 1" itemId="6"/>
      <Slot name="Ring 2" itemId="7"/>
      <Slot name="Amulet" itemId="8"/>
      <Slot name="Belt" itemId="9"/>
      <Slot name="Flask 1" itemId="10"/>
      <!-- Flask 2-5, Trinket -->
    </ItemSet>
  </Items>

  <Tree activeSpec="1">
    <Spec title="Default" treeVersion="3_25"
          nodes="12345,67890,11111,22222"
          masteryEffects="{12345,67890}{11111,22222}"
          ascendClassId="2">
      <Sockets>
        <Socket nodeId="12345" itemId="3"/>
      </Sockets>
    </Spec>
  </Tree>

  <Notes>Build notes text here</Notes>
</PathOfBuilding>
```

## TypeScript Types

Create `types/build.ts`:

```typescript
// types/build.ts

export type Rarity = 'NORMAL' | 'MAGIC' | 'RARE' | 'UNIQUE' | 'GEM' | 'CURRENCY' | 'DIVINATION';

export interface RawItem {
  id: number;
  rawText: string;          // The full PoE item text block (unparsed at this stage)
  variant?: number;
}

export interface ItemSlot {
  name: string;             // "Body Armour", "Helm", "Weapon 1", etc.
  itemId: number;           // 0 = empty
}

export interface ItemSet {
  id: number;
  title: string;
  slots: ItemSlot[];
}

export interface Gem {
  nameSpec: string;         // Display name, e.g. "Fireball"
  skillId?: string;
  level: number;
  quality: number;
  enabled: boolean;
  variantId?: string;
}

export interface SkillGroup {
  label: string;
  slot: string;             // "Weapon 1", "Body Armour", etc.
  enabled: boolean;
  mainActiveSkill: number;  // 1-based index into gems array
  gems: Gem[];
}

export interface SkillSet {
  id: number;
  title: string;
  groups: SkillGroup[];
}

export interface PassiveSpec {
  title: string;
  treeVersion: string;      // e.g. "3_25"
  allocatedNodes: Set<number>;
  masteryEffects: Map<number, number>;  // masteryNodeId → selectedEffectId
  jewelSockets: Map<number, number>;    // nodeId → itemId
  ascendClassId: number;
}

export interface PlayerStats {
  [statName: string]: number;
}

export interface BuildData {
  // Build metadata
  level: number;
  className: string;
  ascendClassName: string;
  bandit: string;
  pantheonMajorGod: string;
  pantheonMinorGod: string;
  mainSocketGroup: number;
  targetVersion: string;
  notes: string;

  // Pre-computed stats from PoB
  playerStats: PlayerStats;
  minionStats: PlayerStats;
  fullDPSSkillName?: string;

  // Items
  rawItems: Map<number, RawItem>;   // itemId → RawItem
  itemSets: ItemSet[];
  activeItemSetId: number;

  // Skills
  skillSets: SkillSet[];
  activeSkillSetId: number;

  // Tree
  passiveSpec: PassiveSpec;
}
```

## Files to Create

`lib/parse-xml.ts`

## Implementation

```typescript
// lib/parse-xml.ts
import type { BuildData, RawItem, ItemSet, ItemSlot, SkillSet, SkillGroup,
              Gem, PassiveSpec, PlayerStats } from '@/types/build';

export function parseBuildXml(xmlString: string): BuildData {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, 'application/xml');

  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error(`XML parse error: ${parseError.textContent}`);
  }

  return {
    ...parseBuildElement(doc),
    ...parseItemsElement(doc),
    ...parseSkillsElement(doc),
    passiveSpec: parseTreeElement(doc),
    notes: doc.querySelector('Notes')?.textContent?.trim() ?? '',
  };
}

// ---------- <Build> ----------

function parseBuildElement(doc: Document) {
  const el = doc.querySelector('Build')!;
  const attr = (name: string, fallback = '') => el.getAttribute(name) ?? fallback;

  const playerStats: PlayerStats = {};
  doc.querySelectorAll('Build > PlayerStat').forEach(s => {
    const stat = s.getAttribute('stat');
    const value = s.getAttribute('value');
    if (stat && value) playerStats[stat] = parseFloat(value);
  });

  const minionStats: PlayerStats = {};
  doc.querySelectorAll('Build > MinionStat').forEach(s => {
    const stat = s.getAttribute('stat');
    const value = s.getAttribute('value');
    if (stat && value) minionStats[stat] = parseFloat(value);
  });

  const fullDPSEl = doc.querySelector('Build > FullDPSSkill');

  return {
    level: parseInt(attr('level', '1'), 10),
    className: attr('className'),
    ascendClassName: attr('ascendClassName'),
    bandit: attr('bandit', 'None'),
    pantheonMajorGod: attr('pantheonMajorGod', 'None'),
    pantheonMinorGod: attr('pantheonMinorGod', 'None'),
    mainSocketGroup: parseInt(attr('mainSocketGroup', '1'), 10),
    targetVersion: attr('targetVersion'),
    playerStats,
    minionStats,
    fullDPSSkillName: fullDPSEl?.getAttribute('name') ?? undefined,
  };
}

// ---------- <Items> ----------

function parseItemsElement(doc: Document) {
  const rawItems = new Map<number, RawItem>();
  doc.querySelectorAll('Items > Item').forEach(el => {
    const id = parseInt(el.getAttribute('id') ?? '0', 10);
    const variant = el.getAttribute('variant');
    rawItems.set(id, {
      id,
      rawText: el.textContent?.trim() ?? '',
      variant: variant ? parseInt(variant, 10) : undefined,
    });
  });

  const itemSets: ItemSet[] = [];
  doc.querySelectorAll('Items > ItemSet').forEach(el => {
    const slots: ItemSlot[] = [];
    el.querySelectorAll('Slot').forEach(slotEl => {
      slots.push({
        name: slotEl.getAttribute('name') ?? '',
        itemId: parseInt(slotEl.getAttribute('itemId') ?? '0', 10),
      });
    });
    itemSets.push({
      id: parseInt(el.getAttribute('id') ?? '1', 10),
      title: el.getAttribute('title') ?? 'Default',
      slots,
    });
  });

  const activeItemSetId = parseInt(
    doc.querySelector('Items')?.getAttribute('activeItemSet') ?? '1', 10
  );

  return { rawItems, itemSets, activeItemSetId };
}

// ---------- <Skills> ----------

function parseSkillsElement(doc: Document) {
  const skillSets: SkillSet[] = [];
  doc.querySelectorAll('Skills > SkillSet').forEach(setEl => {
    const groups: SkillGroup[] = [];
    setEl.querySelectorAll('Skill').forEach(skillEl => {
      const gems: Gem[] = [];
      skillEl.querySelectorAll('Gem').forEach(gemEl => {
        gems.push({
          nameSpec: gemEl.getAttribute('nameSpec') ?? '',
          skillId: gemEl.getAttribute('skillId') ?? undefined,
          level: parseInt(gemEl.getAttribute('level') ?? '1', 10),
          quality: parseInt(gemEl.getAttribute('quality') ?? '0', 10),
          enabled: gemEl.getAttribute('enabled') !== 'false',
          variantId: gemEl.getAttribute('variantId') ?? undefined,
        });
      });
      groups.push({
        label: skillEl.getAttribute('label') ?? '',
        slot: skillEl.getAttribute('slot') ?? '',
        enabled: skillEl.getAttribute('enabled') !== 'false',
        mainActiveSkill: parseInt(skillEl.getAttribute('mainActiveSkill') ?? '1', 10),
        gems,
      });
    });
    skillSets.push({
      id: parseInt(setEl.getAttribute('id') ?? '1', 10),
      title: setEl.getAttribute('title') ?? 'Default',
      groups,
    });
  });

  // Handle builds without SkillSet wrapper (older PoB versions)
  if (skillSets.length === 0) {
    const groups: SkillGroup[] = [];
    doc.querySelectorAll('Skills > Skill').forEach(skillEl => {
      const gems: Gem[] = [];
      skillEl.querySelectorAll('Gem').forEach(gemEl => {
        gems.push({
          nameSpec: gemEl.getAttribute('nameSpec') ?? '',
          level: parseInt(gemEl.getAttribute('level') ?? '1', 10),
          quality: parseInt(gemEl.getAttribute('quality') ?? '0', 10),
          enabled: gemEl.getAttribute('enabled') !== 'false',
        });
      });
      groups.push({
        label: skillEl.getAttribute('label') ?? '',
        slot: skillEl.getAttribute('slot') ?? '',
        enabled: skillEl.getAttribute('enabled') !== 'false',
        mainActiveSkill: parseInt(skillEl.getAttribute('mainActiveSkill') ?? '1', 10),
        gems,
      });
    });
    skillSets.push({ id: 1, title: 'Default', groups });
  }

  const activeSkillSetId = parseInt(
    doc.querySelector('Skills')?.getAttribute('activeSkillSet') ?? '1', 10
  );

  return { skillSets, activeSkillSetId };
}

// ---------- <Tree> ----------

function parseTreeElement(doc: Document): PassiveSpec {
  const activeSpecId = parseInt(
    doc.querySelector('Tree')?.getAttribute('activeSpec') ?? '1', 10
  );

  // Find the active Spec element (by position if no id attr)
  const specEls = doc.querySelectorAll('Tree > Spec');
  const specEl = Array.from(specEls)[activeSpecId - 1] ?? specEls[0];

  if (!specEl) {
    return {
      title: 'Default',
      treeVersion: '',
      allocatedNodes: new Set(),
      masteryEffects: new Map(),
      jewelSockets: new Map(),
      ascendClassId: 0,
    };
  }

  // Parse allocated node IDs (comma-separated)
  const nodesStr = specEl.getAttribute('nodes') ?? '';
  const allocatedNodes = new Set(
    nodesStr.split(',').filter(Boolean).map(n => parseInt(n, 10))
  );

  // Parse mastery effects: "{masteryId,effectId}{masteryId,effectId}..."
  const masteryStr = specEl.getAttribute('masteryEffects') ?? '';
  const masteryEffects = new Map<number, number>();
  const masteryRe = /\{(\d+),(\d+)\}/g;
  let m: RegExpExecArray | null;
  while ((m = masteryRe.exec(masteryStr)) !== null) {
    masteryEffects.set(parseInt(m[1], 10), parseInt(m[2], 10));
  }

  // Parse jewel sockets
  const jewelSockets = new Map<number, number>();
  specEl.querySelectorAll('Sockets > Socket').forEach(s => {
    const nodeId = parseInt(s.getAttribute('nodeId') ?? '0', 10);
    const itemId = parseInt(s.getAttribute('itemId') ?? '0', 10);
    if (nodeId && itemId) jewelSockets.set(nodeId, itemId);
  });

  return {
    title: specEl.getAttribute('title') ?? 'Default',
    treeVersion: specEl.getAttribute('treeVersion') ?? '',
    allocatedNodes,
    masteryEffects,
    jewelSockets,
    ascendClassId: parseInt(specEl.getAttribute('ascendClassId') ?? '0', 10),
  };
}
```

## Notes

- `DOMParser` is browser-only. For SSR in Next.js server components, use the `fast-xml-parser`
  package or the `@xmldom/xmldom` package which provides a `DOMParser` compatible API in Node.
  Wrap with: `const parser = typeof window !== 'undefined' ? new DOMParser() : new (require('@xmldom/xmldom').DOMParser)();`
- Item `rawText` is NOT parsed here — that happens in Step 4 (`item-parser.ts`).
- The `allocatedNodes` set is what gets passed to the tree renderer in Step 3.
