# 00 Master Plan

## Objective
Ship a full read-only Path of Building viewer for Path of Exile 1 with short URLs and PoB-compatible import endpoints.

## Architecture
- apps/web: Next.js UI for paste flow and build visualization.
- apps/worker: Cloudflare Worker for upload and retrieval APIs.
- packages/pob-codec: Base64url + zlib decode/encode.
- packages/pob-parser: XML parse and normalization to BuildPayload.
- packages/shared-types: Contracts shared by parser, worker, and web.
- data/: Vendored extracted metadata from skilltree-export and repoe/pob-data.
- assets/: Self-hosted runtime assets for tree and item/gem visuals.

## Milestones
1. Bootstrap repo, packages, scripts, and shared contracts.
2. Implement build-code decode/encode and parser normalization.
3. Implement worker endpoints and hash-based dedupe storage.
4. Implement web app paste flow and /b/[id] viewer route.
5. Add fixture tests, endpoint tests, and acceptance checklist.
6. Add data/asset ingestion pipeline for self-hosted runtime assets.

## Acceptance Gates
- PoE1 exports decode and parse.
- POST /pob and GET retrieval endpoints operate correctly.
- /b/[id] renders build header, stats, tree panel, items, and skills.
- Tests pass in CI for codec, parser, and worker.
