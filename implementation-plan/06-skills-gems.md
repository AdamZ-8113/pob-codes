# Step 6 — Skills & Gems Display

## Goal

Display the character's skill setups: socket groups, gem names, levels, and quality. Highlight
the main active skill and indicate which group is active.

## Data Available

From the parsed `BuildData` (Step 2):

```typescript
build.skillSets         // Array<SkillSet>
build.activeSkillSetId  // which SkillSet is active
build.mainSocketGroup   // 1-based index of the main skill group in the active set
build.fullDPSSkillName  // name of the skill PoB used for full DPS calculation
```

Each `SkillGroup` has:
- `label` — user-given label (e.g. "Main Skill", "Aura Setup")
- `slot` — where the gems are socketed (e.g. "Body Armour", "Weapon 1", "Helmet")
- `enabled` — whether PoB considers this group active
- `gems[]` — array of Gem objects with nameSpec, level, quality, enabled

## Gem Classification

Gems fall into two visual categories:
- **Active gems** — the skill itself (e.g. "Fireball", "Tornado Shot")
- **Support gems** — name ends in "Support" (e.g. "Spell Echo Support")

Color-code them:
- Active gem: teal/blue name (`#1ba29b` or similar)
- Support gem: grey/silver name (`#aaa`)
- Disabled gem: dimmed, with strikethrough or opacity 0.4

## Component: `components/SkillsPanel.tsx`

```tsx
// components/SkillsPanel.tsx
import type { BuildData, SkillGroup, Gem } from '@/types/build';

interface Props {
  build: BuildData;
}

export function SkillsPanel({ build }: Props) {
  const activeSet = build.skillSets.find(s => s.id === build.activeSkillSetId)
    ?? build.skillSets[0];

  if (!activeSet) return null;

  return (
    <div className="skills-panel">
      <h2 className="panel-title">Skills</h2>

      {/* If multiple skill sets exist, show a tab or selector */}
      {build.skillSets.length > 1 && (
        <div className="skillset-label">Set: {activeSet.title}</div>
      )}

      <div className="skill-groups">
        {activeSet.groups.map((group, index) => {
          const isMainGroup = index + 1 === build.mainSocketGroup;
          return (
            <SkillGroupCard
              key={index}
              group={group}
              isMainGroup={isMainGroup}
              fullDPSSkillName={build.fullDPSSkillName}
            />
          );
        })}
      </div>
    </div>
  );
}

function SkillGroupCard({
  group,
  isMainGroup,
  fullDPSSkillName,
}: {
  group: SkillGroup;
  isMainGroup: boolean;
  fullDPSSkillName?: string;
}) {
  const label = group.label || (isMainGroup ? 'Main Skill' : 'Support');
  const slotLabel = group.slot ? `(${group.slot})` : '';

  return (
    <div className={`skill-group ${isMainGroup ? 'skill-group--main' : ''} ${!group.enabled ? 'skill-group--disabled' : ''}`}>
      <div className="skill-group-header">
        <span className="skill-group-label">{label}</span>
        {slotLabel && <span className="skill-group-slot">{slotLabel}</span>}
        {isMainGroup && <span className="skill-group-badge">Main</span>}
      </div>
      <div className="gem-list">
        {group.gems.map((gem, i) => (
          <GemRow
            key={i}
            gem={gem}
            isMainActive={i + 1 === group.mainActiveSkill}
            isFullDPS={gem.nameSpec === fullDPSSkillName}
          />
        ))}
      </div>
    </div>
  );
}

function GemRow({
  gem,
  isMainActive,
  isFullDPS,
}: {
  gem: Gem;
  isMainActive: boolean;
  isFullDPS: boolean;
}) {
  const isSupport = gem.nameSpec.endsWith('Support') || gem.nameSpec.endsWith('support');
  const isEnabled = gem.enabled;

  return (
    <div className={`gem-row ${!isEnabled ? 'gem-row--disabled' : ''}`}>
      <span className={`gem-name ${isSupport ? 'gem-name--support' : 'gem-name--active'}`}>
        {gem.nameSpec}
        {isFullDPS && <span className="gem-badge gem-badge--dps" title="Full DPS skill">DPS</span>}
      </span>
      <span className="gem-level">L{gem.level}</span>
      {gem.quality > 0 && (
        <span className="gem-quality">Q{gem.quality}</span>
      )}
    </div>
  );
}
```

## CSS

```css
.skills-panel {
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 12px;
}

.panel-title {
  color: #af8040;
  font-size: 16px;
  margin-bottom: 12px;
  border-bottom: 1px solid #333;
  padding-bottom: 6px;
}

.skill-group {
  background: #111;
  border: 1px solid #2a2a2a;
  border-radius: 4px;
  margin-bottom: 8px;
  padding: 8px;
}

.skill-group--main {
  border-color: #af6025;
}

.skill-group--disabled {
  opacity: 0.5;
}

.skill-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.skill-group-label { color: #c8c8c8; font-size: 13px; font-weight: bold; }
.skill-group-slot  { color: #888; font-size: 11px; }
.skill-group-badge {
  background: #7a4514;
  color: #ffcc88;
  font-size: 10px;
  padding: 1px 5px;
  border-radius: 3px;
}

.gem-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
}

.gem-row--disabled { opacity: 0.35; }

.gem-name         { font-size: 13px; flex: 1; }
.gem-name--active { color: #1ba29b; }
.gem-name--support { color: #999; }

.gem-level   { color: #c8c8c8; font-size: 11px; min-width: 24px; }
.gem-quality { color: #7db7d0; font-size: 11px; }

.gem-badge {
  display: inline-block;
  font-size: 9px;
  padding: 0 4px;
  border-radius: 2px;
  margin-left: 4px;
  vertical-align: middle;
}
.gem-badge--dps { background: #4a1010; color: #ff8888; }
```

## Display Ordering

Show skill groups in this order:
1. The main socket group (index matches `build.mainSocketGroup`) — always first
2. Remaining enabled groups
3. Disabled groups last

The `fullDPSSkillName` from the build XML tells you which skill PoB used for DPS calculations —
badge it as "DPS" so users know which skill the stats panel refers to.

## Handling Vaal Gems

Vaal gems appear with "Vaal " prefix (e.g. "Vaal Fireball"). They are active gems; no special
handling needed — just display the name as-is.

## Handling Alternate Quality

PoB supports alternate quality gems (Anomalous, Divergent, Phantasmal). The `variantId` field
on the Gem object contains this info. Display it as a prefix if present and not "Default":

```typescript
const qualityPrefix = gem.variantId && gem.variantId !== 'Default'
  ? `${gem.variantId} `
  : '';
const displayName = qualityPrefix + gem.nameSpec;
```
