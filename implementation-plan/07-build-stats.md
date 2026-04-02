# Step 7 — Build Stats Display

## Goal

Display key pre-computed build statistics sourced directly from `<PlayerStat>` XML elements.
No game math required — PoB already computed everything.

## Data Available

`build.playerStats` is a `Record<string, number>` containing every stat PoB computed.
Common stat keys (exact strings used as the `stat` attribute in the XML):

### Offense
| Key | Display Label |
|---|---|
| `TotalDPS` | Total DPS |
| `AverageDamage` | Average Hit |
| `HitChance` | Hit Chance |
| `CritChance` | Crit Chance |
| `CritMultiplier` | Crit Multi |
| `CastRate` | Casts/sec |
| `AttackRate` | Attacks/sec |
| `TotalDot` | DoT DPS |
| `WithPoisonDPS` | Poison DPS |
| `SkillDPS` | Skill DPS |
| `MineLayRate` | Mines/sec |
| `TrapThrowRate` | Traps/sec |
| `SummonedMinionDPS` | Minion DPS |

### Defense
| Key | Display Label |
|---|---|
| `Life` | Maximum Life |
| `LifeRegen` | Life Regen |
| `LifeUnreserved` | Unreserved Life |
| `Mana` | Maximum Mana |
| `ManaRegen` | Mana Regen |
| `ManaUnreserved` | Unreserved Mana |
| `EnergyShield` | Energy Shield |
| `EnergyShieldRegen` | ES Regen |
| `Armour` | Armour |
| `Evasion` | Evasion |
| `Ward` | Ward |
| `FireResist` | Fire Res |
| `ColdResist` | Cold Res |
| `LightningResist` | Lightning Res |
| `ChaosResist` | Chaos Res |
| `BlockChance` | Block Chance |
| `SpellBlockChance` | Spell Block |
| `AttackDodgeChance` | Attack Dodge |
| `SpellDodgeChance` | Spell Dodge |
| `PhysicalDamageReduction` | Phys Reduction |
| `MeleeEvadeChance` | Melee Evade |

### Speed / Utility
| Key | Display Label |
|---|---|
| `TotalEHP` | Effective HP |
| `EnduranceChargesMax` | Max Endurance |
| `FrenzyChargesMax` | Max Frenzy |
| `PowerChargesMax` | Max Power |
| `Speed` | Movement Speed |

Note: The full list of stat keys is extensive. The above covers the most commonly displayed.
Inspect real build XML to discover which keys are present for a given build type.

## Component: `components/StatsPanel.tsx`

```tsx
// components/StatsPanel.tsx
import type { BuildData } from '@/types/build';

interface StatRow {
  label: string;
  key: string;
  format?: 'number' | 'percent' | 'multiplier' | 'dps';
  decimals?: number;
}

const OFFENSE_STATS: StatRow[] = [
  { label: 'Total DPS',      key: 'TotalDPS',        format: 'dps' },
  { label: 'Average Hit',    key: 'AverageDamage',   format: 'dps' },
  { label: 'Hit Chance',     key: 'HitChance',       format: 'percent', decimals: 1 },
  { label: 'Crit Chance',    key: 'CritChance',      format: 'percent', decimals: 2 },
  { label: 'Crit Multi',     key: 'CritMultiplier',  format: 'multiplier' },
  { label: 'Cast Speed',     key: 'CastRate',        format: 'number', decimals: 2 },
  { label: 'Attack Speed',   key: 'AttackRate',      format: 'number', decimals: 2 },
  { label: 'DoT DPS',        key: 'TotalDot',        format: 'dps' },
  { label: 'Minion DPS',     key: 'SummonedMinionDPS', format: 'dps' },
];

const DEFENSE_STATS: StatRow[] = [
  { label: 'Life',           key: 'Life',            format: 'number' },
  { label: 'Energy Shield',  key: 'EnergyShield',    format: 'number' },
  { label: 'Mana',           key: 'Mana',            format: 'number' },
  { label: 'Armour',         key: 'Armour',          format: 'number' },
  { label: 'Evasion',        key: 'Evasion',         format: 'number' },
  { label: 'Ward',           key: 'Ward',            format: 'number' },
  { label: 'Eff. HP',        key: 'TotalEHP',        format: 'number' },
  { label: 'Fire Res',       key: 'FireResist',      format: 'percent', decimals: 0 },
  { label: 'Cold Res',       key: 'ColdResist',      format: 'percent', decimals: 0 },
  { label: 'Lightning Res',  key: 'LightningResist', format: 'percent', decimals: 0 },
  { label: 'Chaos Res',      key: 'ChaosResist',     format: 'percent', decimals: 0 },
  { label: 'Block',          key: 'BlockChance',     format: 'percent', decimals: 0 },
  { label: 'Spell Block',    key: 'SpellBlockChance',format: 'percent', decimals: 0 },
  { label: 'Phys Reduction', key: 'PhysicalDamageReduction', format: 'percent', decimals: 0 },
];

interface Props {
  build: BuildData;
}

export function StatsPanel({ build }: Props) {
  const stats = build.playerStats;

  // Determine the primary DPS stat to highlight (non-zero highest priority)
  const primaryDPSKey = ['TotalDPS', 'SummonedMinionDPS', 'TotalDot']
    .find(k => (stats[k] ?? 0) > 0) ?? 'TotalDPS';

  return (
    <div className="stats-panel">
      <h2 className="panel-title">Character Stats</h2>
      <div className="stats-character-line">
        <span className="stats-class">{build.ascendClassName || build.className}</span>
        <span className="stats-level">Level {build.level}</span>
      </div>

      {build.fullDPSSkillName && (
        <div className="stats-dps-skill">DPS Skill: {build.fullDPSSkillName}</div>
      )}

      <div className="stats-columns">
        <StatSection title="Offense" rows={OFFENSE_STATS} stats={stats} primaryKey={primaryDPSKey} />
        <StatSection title="Defense" rows={DEFENSE_STATS} stats={stats} />
      </div>

      {/* Charges */}
      <ChargeDisplay stats={stats} />

      {/* Bandit / Pantheon */}
      <div className="stats-misc">
        {build.bandit && build.bandit !== 'None' && (
          <div>Bandit: <span className="misc-value">{build.bandit}</span></div>
        )}
        {build.pantheonMajorGod && build.pantheonMajorGod !== 'None' && (
          <div>Pantheon: <span className="misc-value">{build.pantheonMajorGod}</span>
            {build.pantheonMinorGod !== 'None' && ` / ${build.pantheonMinorGod}`}
          </div>
        )}
      </div>
    </div>
  );
}

function StatSection({
  title,
  rows,
  stats,
  primaryKey,
}: {
  title: string;
  rows: StatRow[];
  stats: Record<string, number>;
  primaryKey?: string;
}) {
  // Only show rows where the stat exists and is non-zero
  const visibleRows = rows.filter(row => (stats[row.key] ?? 0) !== 0);
  if (visibleRows.length === 0) return null;

  return (
    <div className="stat-section">
      <div className="stat-section-title">{title}</div>
      {visibleRows.map(row => (
        <div key={row.key} className={`stat-row ${row.key === primaryKey ? 'stat-row--primary' : ''}`}>
          <span className="stat-label">{row.label}</span>
          <span className="stat-value">{formatStat(stats[row.key], row)}</span>
        </div>
      ))}
    </div>
  );
}

function formatStat(value: number, row: StatRow): string {
  if (value === undefined || value === null) return '—';
  const decimals = row.decimals ?? 0;

  switch (row.format) {
    case 'percent':
      return `${value.toFixed(decimals)}%`;
    case 'multiplier':
      return `${value.toFixed(0)}%`;
    case 'dps':
      // Format large numbers: 1234567 → "1.23M", 12345 → "12,345"
      if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(2)}M`;
      if (value >= 1_000) return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
      return value.toFixed(1);
    default:
      return value.toLocaleString('en-US', { maximumFractionDigits: decimals });
  }
}

function ChargeDisplay({ stats }: { stats: Record<string, number> }) {
  const charges = [
    { key: 'EnduranceChargesMax', label: 'Endurance', color: '#e05530' },
    { key: 'FrenzyChargesMax',    label: 'Frenzy',    color: '#30a060' },
    { key: 'PowerChargesMax',     label: 'Power',     color: '#6030c0' },
  ].filter(c => (stats[c.key] ?? 0) > 0);

  if (charges.length === 0) return null;

  return (
    <div className="charge-display">
      {charges.map(c => (
        <div key={c.key} className="charge-row">
          <span className="charge-label" style={{ color: c.color }}>{c.label}</span>
          <span className="charge-value">{stats[c.key]}</span>
        </div>
      ))}
    </div>
  );
}
```

## CSS

```css
.stats-panel {
  background: #1a1a1a;
  border: 1px solid #333;
  padding: 12px;
  min-width: 220px;
}

.stats-character-line {
  display: flex;
  justify-content: space-between;
  color: #af8040;
  margin-bottom: 8px;
}

.stats-class  { font-size: 15px; font-weight: bold; }
.stats-level  { font-size: 13px; color: #888; }

.stats-dps-skill {
  font-size: 11px;
  color: #888;
  margin-bottom: 8px;
  font-style: italic;
}

.stats-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.stat-section { }
.stat-section-title {
  color: #af8040;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 1px;
  margin-bottom: 4px;
  border-bottom: 1px solid #2a2a2a;
  padding-bottom: 2px;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  padding: 2px 0;
  font-size: 13px;
}

.stat-row--primary {
  background: #1f1000;
  padding: 2px 4px;
  border-radius: 2px;
}

.stat-label { color: #888; }
.stat-value { color: #c8c8c8; font-weight: bold; }
.stat-row--primary .stat-value { color: #ffcc66; }

.charge-display {
  margin-top: 8px;
  display: flex;
  gap: 12px;
  font-size: 12px;
}

.stats-misc {
  margin-top: 8px;
  font-size: 12px;
  color: #666;
}
.misc-value { color: #aaa; }
```

## Resistance Colors

For resistance display, apply color coding:
- `>= 75%` → gold (capped) `#ffcc00`
- `>= 0%` → white `#c8c8c8`
- `< 0%` → red (dangerous) `#ff4444`

```typescript
function getResistClass(value: number): string {
  if (value >= 75) return 'resist--capped';
  if (value >= 0) return 'resist--ok';
  return 'resist--negative';
}
```
