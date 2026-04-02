# 09 Data Ingestion Assets

## Sources
- grindinggear/skilltree-export for tree metadata and sprites.
- repoe-fork/repoe and repoe-fork/pob-data for item/gem/stat metadata.

## Asset Policy
- Self-host all runtime assets in assets/.
- data/ stores normalized metadata snapshots used by web and parser layers.

## Pipeline Steps
1. Fetch upstream source snapshots.
2. Normalize to project-specific compact json.
3. Copy/convert visual assets to deterministic paths.
4. Validate references from normalized payloads to assets.
5. Commit snapshot version + source metadata.

## Deliverables
- data/README.md with source versions and update process.
- assets/README.md with naming/path conventions.
- scripts/sync-data.* and scripts/verify-assets.* in a follow-up commit.
