# 05 Passive Tree

## v1 Rendering Strategy
- Render from normalized active tree spec in web app.
- Display tree version, active node count, and spec switching metadata.
- Keep renderer interface ready for asset-backed interactive canvas.

## Renderer Input Contract
- version
- nodes
- classId
- ascendancyId
- secondaryAscendancyId
- sockets
- overrides

## Future Interactive Layer
- Bind self-hosted versioned tree assets by spec.version.
- Highlight allocated nodes and links.
- Show node hover details and mastery/tattoo overrides.

## Current Implementation Status
- Panel and data wiring implemented in apps/web/components/passive-tree-panel.tsx.
- Full interactive graphics to be added after asset ingestion pipeline is populated.
