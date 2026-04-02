# Foulborn Upscaling

This document records the current Foulborn upscaling workflow, the exact toolchain and parameters in use, the generated output locations, and the runtime path order now used by the app.

## Current state

Foulborn item art now resolves in this order for all Foulborn items:

1. `/assets/items/art/Foulborn/Upscaled/<relative path>`
2. `/assets/items/art/Foulborn/LowResolution/<relative path>`
3. `/assets/items/art/<relative path>`

The low-resolution originals were intentionally moved under `Foulborn/LowResolution` so they are visibly treated as fallback assets, not the preferred source.

Current generated totals:

- guided-luma upscaled assets: `237`
- review comparison strips: `237`

Generated outputs:

- low-resolution originals: `apps/web/public/assets/items/art/Foulborn/LowResolution/...`
- guided-luma upscaled assets: `apps/web/public/assets/items/art/Foulborn/Upscaled/...`
- review strips: `tmp/upscaled_foulborn_comparison/...`
- inventory JSON: `data/generated/foulborn-upscale-inventory.json`
- upscaled manifest JSON: `data/generated/foulborn-upscaled-art-manifest.json`

## Toolchain

The current batch workflow uses a local Python venv:

- `.venv-foulborn`

Installed packages:

- `Pillow 12.1.1`
- `opencv-python-headless 4.13.0.92`
- `numpy 2.4.4`

Primary scripts:

- `scripts/download-foulborn-art.mjs`
- `scripts/build-foulborn-upscaled-art.py`

## Input and output model

For each Foulborn asset, the batch script uses exactly three images:

1. base regular asset
2. base Foulborn low-resolution asset
3. guided-luma upscaled asset

It does not emit or keep the older exploratory variants like delta transfer, hybrid transfer, or guided-ratio outputs.

The file tree mirrors the existing item-art schema:

- base regular: `/assets/items/art/<relative path>`
- base Foulborn low-resolution: `/assets/items/art/Foulborn/LowResolution/<relative path>`
- guided-luma upscaled: `/assets/items/art/Foulborn/Upscaled/<relative path>`

Example for `Foulborn Aegis Aurora`:

- base regular: `/assets/items/art/Armours/Shields/ShieldStrIntUnique7unique.png`
- base Foulborn low-resolution: `/assets/items/art/Foulborn/LowResolution/Armours/Shields/ShieldStrIntUnique7unique.png`
- guided-luma upscaled: `/assets/items/art/Foulborn/Upscaled/Armours/Shields/ShieldStrIntUnique7unique.png`

## Guided-luma algorithm

The accepted method is guided luma transfer. It keeps the mutated Foulborn look of the low-resolution source art while reintroducing real detail from the high-resolution base art.

### Step 1. Build the naive high-resolution Foulborn image

The low-resolution Foulborn image is resized directly to the base image size with:

- interpolation: `cv2.INTER_LANCZOS4`

This naive upscale is used as the color and chroma source for the final image.

### Step 2. Convert base HR and naive upscale to LAB

Both images are converted from RGB to LAB with OpenCV:

- `cv2.COLOR_RGB2LAB`

Only the luminance channel is modified in the guided-luma pass.

### Step 3. Extract high-frequency luma detail from the base HR image

The base image luma channel is processed as follows:

- Gaussian blur sigma: `1.15`
- blur call: `cv2.GaussianBlur(..., sigmaX=1.15, sigmaY=1.15)`
- edge detector: `cv2.Laplacian(..., cv2.CV_32F, ksize=3)`

From that:

- `detail_l = base_l - blurred_l`
- `edge_mask = abs(laplacian(base_l)) / max(abs(laplacian(base_l)))`

### Step 4. Weight detail injection by alpha and edge strength

The detail weight is:

- `detail_weight = alpha_mask * (0.55 + 0.45 * edge_mask)`

Where:

- `alpha_mask` is the base HR alpha channel clamped to `0..1`

This prevents detail recovery from being applied uniformly across empty or low-value regions.

### Step 5. Inject base detail into the naive Foulborn luma

The luma update is:

- `result_lab[..., 0] = naive_lab[..., 0] + detail_l * detail_weight * 1.35`

Key multiplier:

- luma strength multiplier: `1.35`

The result is then clamped back to `0..1`.

### Step 6. Preserve color while restoring structure

The RGB result is reconstructed from the modified LAB image using:

- `cv2.COLOR_LAB2RGB`

This preserves the naive upscale's mutation color and glow character while restoring structure from the base HR art.

### Step 7. Final alpha

The final alpha is:

- `max(base_hr_alpha, naive_hr_alpha)`

That keeps the base silhouette while preserving any alpha carried by the upscaled Foulborn source.

## Comparison strips

Every generated review strip contains exactly three panels:

1. `Base HR`
2. `Base Foulborn`
3. `Guided Luma Upscaled`

They are written to:

- `tmp/upscaled_foulborn_comparison/<relative path>.png`

Example:

- `tmp/upscaled_foulborn_comparison/Armours/Shields/ShieldStrIntUnique7unique.png`

## Generated metadata

### Low-resolution manifest

The downloaded original-art manifest is:

- `data/generated/foulborn-art-manifest.json`

It maps:

- `Foulborn unique name -> /assets/items/art/Foulborn/LowResolution/...`

### Inventory

The batch inventory file is:

- `data/generated/foulborn-upscale-inventory.json`

Each entry records:

- Foulborn unique name
- base unique name
- mirrored relative path
- regular public path
- Foulborn low-resolution public path
- upscaled public path
- comparison strip path
- base size
- Foulborn size
- upscaled size
- generation status

### Upscaled manifest

The generated upscaled manifest file is:

- `data/generated/foulborn-upscaled-art-manifest.json`

It maps:

- `Foulborn unique name -> upscaled public path`

The runtime currently derives the upscaled path from the normal base-art path, so this manifest is primarily useful for auditing and future tooling.

## Runtime integration

Relevant runtime files:

- `apps/web/lib/icon-paths.ts`
- `apps/web/components/items-panel.tsx`

Current runtime behavior for all Foulborn uniques:

1. derive a mirrored upscaled path from the resolved normal item art path
2. probe whether that Foulborn upscaled asset exists
3. fall back to the mirrored `Foulborn/LowResolution/...` original if needed
4. fall back to the normal base art as the final fallback

`scripts/sync-data.mjs` still merges the low-resolution Foulborn manifest into the generated asset manifest so the original mutated art remains available as a known fallback path.

## Operational workflow

When new low-resolution Foulborn art is downloaded:

1. run `node scripts/download-foulborn-art.mjs`
2. run `.\.venv-foulborn\Scripts\python.exe scripts\build-foulborn-upscaled-art.py`
3. review strips in `tmp/upscaled_foulborn_comparison/`
4. run `node scripts/sync-data.mjs` so generated manifests reflect the latest `LowResolution` paths

## Next improvements

The next likely upgrades to this pipeline are:

1. add per-item overrides for guided-luma strength or blur sigma where a few assets need manual tuning
2. add a validation script that checks for mismatches between derived mirrored paths and the generated upscaled manifest
3. fold the upscaled manifest into generated metadata if runtime ever needs explicit per-item overrides instead of mirrored path derivation
