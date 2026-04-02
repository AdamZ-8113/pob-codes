# Step 1 — Build String Decoding

## Goal

Convert a PoB shareable code string into a raw XML string that can be parsed in Step 2.

## How PoB Encodes Builds

PoB's Lua source (`src/Modules/Build.lua`) does this to generate a share code:

```lua
common.base64.encode(Deflate(xml_string)):gsub("+","-"):gsub("/","_")
```

So the encoding is:
1. XML string → zlib DEFLATE compressed bytes
2. Compressed bytes → standard Base64
3. Replace `+` with `-` and `/` with `_` (URL-safe Base64)
4. No padding (`=`) may be present — must be re-added for decoding

The reverse is straightforward.

## Where the Code Comes From

- **Direct paste**: User pastes the raw code string (from PoB's "Copy" button)
- **URL query param**: `/?code=<string>`
- **Short URL slug**: `/builds/h-si3kweTn_N` — the slug maps to the raw code stored in KV
  (see Step 8). The raw code is retrieved and then decoded the same way.

## File to Create

`lib/decode.ts`

## Implementation

Install dependency:
```bash
npm install pako
npm install --save-dev @types/pako
```

```typescript
// lib/decode.ts
import { inflate } from 'pako';

/**
 * Decodes a PoB share code into a raw XML string.
 *
 * The code is URL-safe base64 of zlib-deflated UTF-8 XML.
 */
export function decodeBuildCode(code: string): string {
  // 1. Restore standard base64 characters
  const b64 = code
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  // 2. Add base64 padding if missing
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);

  // 3. Decode base64 to binary
  const binaryStr = atob(padded);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }

  // 4. Zlib inflate (pako handles both zlib and raw deflate headers)
  const inflated = inflate(bytes);

  // 5. Decode UTF-8 bytes to string
  return new TextDecoder('utf-8').decode(inflated);
}
```

## Edge Cases

- Some very old PoB codes may use raw DEFLATE without a zlib header. If `inflate` throws,
  try `inflateRaw` from pako as a fallback:

```typescript
import { inflate, inflateRaw } from 'pako';

export function decodeBuildCode(code: string): string {
  const bytes = base64ToBytes(code);
  try {
    return new TextDecoder().decode(inflate(bytes));
  } catch {
    return new TextDecoder().decode(inflateRaw(bytes));
  }
}

function base64ToBytes(code: string): Uint8Array {
  const b64 = code.replace(/-/g, '+').replace(/_/g, '/');
  const padded = b64 + '='.repeat((4 - (b64.length % 4)) % 4);
  const binaryStr = atob(padded);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}
```

- If `atob` fails, the code is invalid — surface a user-facing error: "Invalid build code."
- The resulting string should start with `<?xml` or `<PathOfBuilding`. Validate this before
  passing to the parser.

## Verification

To test against a real build, grab any pobb.in URL (e.g. `pobb.in/h-si3kweTn_N`). The slug
after the `/` IS the raw PoB code. Decode it and verify the output starts with
`<PathOfBuilding>`.

```typescript
// Quick test (browser console or Node):
const code = 'h-si3kweTn_N'; // replace with any real code
console.log(decodeBuildCode(code).slice(0, 200));
```

## Server-Side Variant (for Next.js SSR)

On the server (Node.js), `atob` is available in Node 18+. `pako` works in both environments.
No changes needed — the same function works server and client.
