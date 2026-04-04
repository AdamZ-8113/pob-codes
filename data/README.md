# Data Directory

This folder stores vendored and normalized metadata snapshots used by the parser and web app.

## Planned Sources
- https://github.com/grindinggear/skilltree-export
- https://github.com/repoe-fork/repoe
- https://github.com/repoe-fork/pob-data

## Update Process
1. Run `npm run sync:data` to clone upstream snapshots and regenerate `data/generated`.
2. Review `data/generated/source-meta.json` for source commit hashes and extraction timestamp.
3. Run `npm run verify:assets` to confirm generated asset references are valid.
4. Commit regenerated metadata and public assets together.

## Generated Outputs
- `data/generated/source-meta.json`
- `data/generated/tree-manifest.json`
- `data/generated/item-icon-manifest.json`
- `data/generated/gem-icon-manifest.json`
- `data/generated/skilltree/*.json`
