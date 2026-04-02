# 01 Repo Bootstrap

## Monorepo Layout
- apps/web
- apps/worker
- packages/pob-codec
- packages/pob-parser
- packages/shared-types
- data
- assets
- tests/fixtures

## Tooling
- npm workspaces at root package.json.
- TypeScript strict mode via tsconfig.base.json.
- Vitest as package-level test runner.

## Baseline Scripts
- Root: build, test, typecheck, dev:web, dev:worker.
- Package-level build/typecheck/test scripts in each workspace.

## CI Baseline
- Install dependencies.
- Run npm run typecheck.
- Run npm run test.
- Optional: run npm run build for release workflows.

## Immediate Follow-up
- Add GitHub Actions workflow with matrix for node LTS.
- Add branch protection requiring typecheck + test.
