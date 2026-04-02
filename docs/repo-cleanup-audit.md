# Repo Cleanup Audit

## Purpose

This document captures a repo-structure audit of the current workspace, with recommendations for:

- what should likely be deleted
- what should likely be moved or reorganized
- what should not be committed to GitHub
- what does not need to be part of a production website deployment

This is an audit only. No cleanup actions are assumed to be done yet.

## High-Level Findings

The repo currently mixes four different classes of content in one root:

1. application source and required runtime assets
2. generated build outputs and local tool state
3. local-only upstream mirrors and scratch work
4. planning and AI handoff documents

The biggest cleanup opportunities are not small files. They are:

- `local-pob-mirror/` at about 1.35 GB
- `apps/web/.next/` at about 555 MB
- `node_modules/` at about 506 MB
- `.venv-foulborn/` at about 186 MB
- `apps/web/public/assets/` at about 128 MB
- `tmp/` at about 24 MB
- `apps/worker/.wrangler/` at about 37 MB

Only some of those are valid long-term repo content.

## Recommended Categories

### A. Delete Or Remove From The Repo Root

These look like either accidental leftovers or stale local-only artifacts.

#### 1. `CON`

Recommendation:
- remove it

Why:
- it is a stray root-level file with a Windows-reserved name
- it contains an old React component dump, not a normal project artifact
- a reserved filename is risky on Windows and will confuse tooling

Notes:
- because the filename is reserved, deleting it may require using a literal `\\?\` path

#### 2. `pob-upstream-legacy/`

Recommendation:
- remove it unless you know a current workflow still needs it

Why:
- it appears to contain only a nested `.git` directory
- no active repo scripts reference it
- there is no evidence it is part of the current data pipeline

#### 3. `apps/web/app/api/pob-test/`

Recommendation:
- remove it

Why:
- it is an empty app route folder
- empty route folders add noise and imply unfinished or abandoned work

#### 4. Root `tests/fixtures/`

Recommendation:
- remove it, or actually use it

Why:
- the folder is empty
- the real sample-fixture usage currently comes from `data/*.txt`, not `tests/fixtures/`

## B. Keep Local, But Do Not Commit

These are legitimate local dev artifacts, but they should not live in Git.

#### 1. `.venv-foulborn/`

Recommendation:
- do not commit it
- keep it only as a local virtualenv, or move it outside the repo

Why:
- it is a local Python environment used for the Foulborn upscaling flow
- it is machine-specific and rebuildable
- it adds about 186 MB of local-only state

Evidence:
- [docs/foulborn-upscaling.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/docs/foulborn-upscaling.md#L30) explicitly treats `.venv-foulborn` as a local workflow dependency

#### 2. `tmp/`

Recommendation:
- do not commit it
- keep it for scratch analysis only, or periodically clear it

Why:
- it is mostly review strips and inspection scratch files
- about 22.7 MB of it is `tmp/upscaled_foulborn_comparison/`
- the remaining files are one-off HTML, PNG, JSON, JS, TS, and raw text artifacts

Evidence:
- [docs/foulborn-upscaling.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/docs/foulborn-upscaling.md#L24) documents `tmp/upscaled_foulborn_comparison` as review output, not product runtime

#### 3. `.pob-codes-web.pid` and `.pob-codes-worker.pid`

Recommendation:
- do not commit them

Why:
- they are runtime process-tracking files created by local dev tooling
- they are disposable and machine-local

Evidence:
- [restart-dev.cmd](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/restart-dev.cmd#L9) creates and manages these PID files

#### 4. `.tmp-inspect-timeless.ts`

Recommendation:
- remove it or move it under a clearly local-only scratch area

Why:
- it is a one-off inspection helper
- it does not belong at the repo root
- it is not part of the formal scripts toolchain

#### 5. `.claude/settings.local.json`

Recommendation:
- do not commit it

Why:
- it is clearly user-local tooling configuration
- local editor/assistant permissions should not usually be shared repo state

#### 6. `local-pob-mirror/`

Recommendation:
- do not commit it
- ideally move it outside the repo root or rework the workflow so it is recreated on demand

Why:
- it is a local clone of the PoB upstream repo
- its `.git` directory alone is about 723 MB
- the whole folder is about 1.35 GB
- it is a development input, not product source

Evidence:
- [scripts/update-local-pob-mirror.mjs](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/scripts/update-local-pob-mirror.mjs#L7) creates and updates it as a clone
- [data_pipeline.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/data_pipeline.md#L165) describes it as a local checked-out copy used for generation

## C. Keep, But Reorganize

These are not necessarily wrong to keep, but they are currently in awkward or misleading places.

#### 1. `data/*.txt` sample PoB inputs

Recommendation:
- move them into a real fixture location

Suggested target:
- `apps/worker/test/fixtures/`
- or `tests/fixtures/worker/`

Why:
- these files are sample test fixtures, not general app data
- mixing them with generated runtime metadata makes `data/` harder to understand

Evidence:
- [apps/worker/src/index.test.ts](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/apps/worker/src/index.test.ts#L382) loads a `.txt` file from `../../data`

#### 2. `CONTEXT_HANDOFF.md`

Recommendation:
- move it under `docs/ai/` or `docs/handoffs/`, or remove it when stale

Why:
- it is an AI session handoff note, not product documentation
- keeping it at the repo root makes the root noisier than it needs to be

#### 3. `data_pipeline.md`

Recommendation:
- move it under `docs/`

Why:
- it is useful documentation, but it is repo documentation, not root-level product metadata

#### 4. `codex-implementation/` and `implementation-plan/`

Recommendation:
- consolidate them into `docs/archive/` or keep only one active planning tree

Why:
- both are planning/history directories rather than product source
- `implementation-plan/` is not referenced anywhere current
- `codex-implementation/` is still referenced by the README, but it also looks archival

Evidence:
- [README.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/README.md#L24) points to `codex-implementation`

#### 5. Root `assets/` directory

Recommendation:
- either remove it or convert it into real content
- if it stays documentation-only, move its README into `docs/`

Why:
- it contains only `assets/README.md`
- actual runtime assets live under `apps/web/public/assets/`

Evidence:
- [assets/README.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/assets/README.md) says the sync pipeline writes servable assets under `apps/web/public/assets`

## D. Keep And Commit

These look like real project assets or generated sources that the app actually depends on.

#### 1. `apps/web/public/assets/`

Recommendation:
- keep it committed
- keep it part of the production deployment

Why:
- the app directly references these files at runtime
- this is the actual self-hosted asset tree

Notes:
- this directory is large, but it is legitimate runtime content

#### 2. `data/generated/`

Recommendation:
- keep it committed

Why:
- it stores normalized metadata snapshots produced by the sync pipeline
- the repo's documented workflow expects those outputs to be committed together with runtime asset updates

Evidence:
- [data/README.md](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/data/README.md#L9) describes the update and commit workflow

#### 3. `apps/web/lib/generated/` and `packages/pob-parser/src/generated/`

Recommendation:
- keep them committed
- do not hand-edit them

Why:
- they are generated source modules that the app and parser import directly
- they belong in version control if the current workflow depends on generated checked-in outputs

## Git Ignore Recommendations

The current [`.gitignore`](/c:/Vibe%20Code%20Projects/PoBB%20Replacement/.gitignore#L1) is too minimal for the actual repo shape.

Recommended additions:

- `local-pob-mirror/`
- `pob-upstream-legacy/`
- `tmp/`
- `.tmp-*`
- `.venv*/`
- `*.pid`
- `.claude/settings.local.json`
- `*.tsbuildinfo`

Optional additions:

- `.DS_Store`
- `Thumbs.db`
- `*.log`

## Deployment Exclusions

These do not need to be part of a production website deployment artifact.

### Should Not Be In The Runtime Deployment

- `.claude/`
- `.venv-foulborn/`
- `tmp/`
- `local-pob-mirror/`
- `pob-upstream-legacy/`
- `codex-implementation/`
- `implementation-plan/`
- `docs/`
- `tests/`
- `scripts/`
- `.pob-codes-web.pid`
- `.pob-codes-worker.pid`
- `.tmp-inspect-timeless.ts`
- `CONTEXT_HANDOFF.md`
- `data_pipeline.md`

### Should Be In The Runtime Deployment

- application code under `apps/web` and `apps/worker`
- shared packages under `packages/`
- static runtime assets under `apps/web/public/assets/`
- any generated metadata required by the build or runtime, including committed generated source modules

## Structural Recommendations

These are not immediate deletions, but they would improve repo hygiene.

### 1. Move local mirrors outside the repo root

Strong recommendation:
- stop keeping `local-pob-mirror/` inside the main project tree

Better options:
- clone it into a sibling directory outside the repo
- or update the generator workflow so it uses the same fresh clone model as `sync:data`
- or use a shallow clone rather than a full-history clone

Why:
- the current clone script uses a full `git clone` with full history
- the local mirror's `.git` history is the single largest avoidable storage cost in the repo tree

### 2. Separate fixtures from generated data

Recommendation:
- reserve `data/` for committed generated metadata and source snapshots
- move human-named PoB sample inputs into a dedicated fixtures path

Why:
- `data/` currently contains both generated metadata and test fixtures
- that makes the directory do two unrelated jobs

### 3. Consolidate docs

Recommendation:
- use `docs/` as the single documentation root
- archive stale planning material under `docs/archive/`

Why:
- docs are currently split across root markdown files, `docs/`, `codex-implementation/`, and `implementation-plan/`
- that makes it unclear which documents are current

## Priority Order

If you want the highest-value cleanup order, this is the order I would use:

1. remove `CON`
2. remove `pob-upstream-legacy/`
3. add the missing `.gitignore` entries
4. remove PID files and the root scratch file
5. clear or archive `tmp/`
6. remove the empty `apps/web/app/api/pob-test/`
7. remove the empty root `tests/fixtures/`
8. move `data/*.txt` into a real fixture directory
9. move root docs into `docs/`
10. move `local-pob-mirror/` outside the repo or redesign that workflow

## Summary Judgment

The repo's real product structure is reasonably small:

- `apps/`
- `packages/`
- `data/generated/`
- `apps/web/public/assets/`
- `scripts/`

Most of the cleanup pain is coming from local-only artifacts, archival planning material, and upstream mirrors living beside the product code.

The single most important Git hygiene improvements are:

1. stop treating local mirrors and local envs as repo-root content
2. tighten `.gitignore`
3. separate fixtures, docs, and scratch outputs from runtime data
