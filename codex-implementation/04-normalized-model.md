# 04 Normalized Model

## Canonical Types
Defined in packages/shared-types/src/index.ts:
- BuildPayload
- BuildSectionPayload
- TreeSpecPayload
- ItemPayload
- ItemSetPayload
- SkillSetPayload
- SkillGroupPayload
- GemPayload
- StatsPayload

## Key Normalization Decisions
- activeTreeIndex is zero-based for frontend convenience.
- activeSkillSetId and activeItemSetId are preserved from source when available.
- stats.player and stats.minion are flat key/value maps from exported xml stats.
- meta.source is code or id depending on request flow.

## API Contracts
- UploadResponse: { id, shortUrl }
- ErrorResponse: { error, code? }
