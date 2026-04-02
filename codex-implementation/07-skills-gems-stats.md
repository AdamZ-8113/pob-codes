# 07 Skills Gems Stats

## Skill Model
- Support active skill set and legacy skill layout.
- Preserve slot, label, enabled flags, mainActiveSkill, and gem list.
- Infer support gems from gemId/skillId/name patterns.

## Stats Model
- Preserve exported PlayerStat and MinionStat exactly.
- Preserve FullDPSSkill rows as structured list.
- No custom stat recalculation in v1.

## UI
- Skills panel displays grouped gems with support markers.
- Stats panel displays representative exported values.

## Current Implementation Status
- Normalization implemented in packages/pob-parser/src/index.ts.
- Skills and stats panels implemented in apps/web/components.
