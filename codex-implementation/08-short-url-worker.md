# 08 Short URL Worker

## Endpoints
- POST /pob
- GET /pob/:id
- GET /:id/raw
- GET /:id/json

## Storage
- Cloudflare KV binding BUILD_CODES.
- Key is short hash of raw PoB code.
- Hash-based id gives deterministic dedupe behavior.

## Validation
- Reject empty body.
- Enforce max upload size.
- Reject invalid PoB code before storage.

## Caching
- raw responses immutable and cacheable.
- json responses short-lived cache.

## Current Implementation Status
- Worker implemented in apps/worker/src/index.ts.
- Route tests included in apps/worker/src/index.test.ts.
