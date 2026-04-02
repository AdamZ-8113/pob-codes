# 10 Test Plan

## Unit
- Codec: round-trip, invalid base64, invalid zlib, invalid xml.
- Parser: PoE1 fixture, unsupported-root rejection, legacy skill layout fixture.
- Item parser: rarity/name/base extraction and flag detection.

## Integration
- Worker: upload, dedupe id behavior, raw/json retrieval, not-found, size rejection.
- Web data path: fetchBuildPayload shape and error handling.

## E2E Acceptance Scenarios
1. Upload valid PoE1 code -> open /b/:id -> render header/stats/items/skills/tree panel.
2. Upload unsupported non-PoE1 code -> API returns structured 400 error.
3. Invalid upload -> API returns structured 400 error.

## Quality Gates
- npm run typecheck passes across all workspaces.
- npm run test passes across all workspaces.
- Parser fixture coverage includes both modern and legacy shapes.
