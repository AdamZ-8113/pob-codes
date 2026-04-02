# 06 Items Tooltips Icons

## Item Parsing
Parse raw item text into:
- rarity
- name/base
- implicits
- explicits
- enchantments
- influence markers
- fractured/corrupted/mirrored flags

## Icon Resolution Contract
ItemPayload includes iconKey for deterministic resolver input.

## Tooltip Rendering
v1 panel renders slot, item name/base, and rarity styling.

## Self-hosted Asset Requirement
- Runtime icon URLs must map to self-hosted assets.
- External CDN fallback is intentionally excluded in v1.

## Current Implementation Status
- Raw parser implemented in packages/pob-parser/src/item-parser.ts.
- Viewer panel implemented in apps/web/components/items-panel.tsx.
- Asset mapping population handled by data ingestion phase.
