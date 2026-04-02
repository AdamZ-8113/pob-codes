# Step 8 — Short URL Storage

## Goal

Allow users to share builds via short URLs (e.g. `/builds/abc123`) rather than pasting full
build codes. The raw PoB code string is stored server-side and retrieved by slug.

## Architecture

```
User pastes PoB code → POST /api/save → { slug }
User visits /builds/{slug} → GET /api/build/{slug} → raw code → decode + render
```

The slug IS the lookup key. No need for sequential IDs.

## Option A: Cloudflare Workers + KV (Recommended)

Zero infrastructure, free tier: 100k reads/day, 1k writes/day, 1GB storage.

### KV Schema

```
Key:   slug (e.g. "h-si3kweTn_N")
Value: raw PoB code string (already base64+deflated — just store it as-is)
TTL:   optional, e.g. 90 days (or none for permanent)
```

Note: If the user shares an existing pobb.in URL, the slug from the pobb.in URL IS the raw
PoB code (pobb.in uses the code directly as the slug). So you can store it under the same
key and get URL compatibility.

### Cloudflare Worker (save endpoint)

```typescript
// workers/save.ts (deploy as Cloudflare Worker)
export interface Env {
  BUILDS: KVNamespace;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'POST, GET',
          'Access-Control-Allow-Headers': 'Content-Type',
        },
      });
    }

    const url = new URL(request.url);

    // POST /save — store a build code, return slug
    if (request.method === 'POST' && url.pathname === '/save') {
      const { code } = await request.json() as { code: string };
      if (!code || typeof code !== 'string' || code.length > 100_000) {
        return Response.json({ error: 'Invalid code' }, { status: 400 });
      }

      // Generate slug: use first 12 chars of the code (it's already URL-safe base64)
      // Collision probability is negligible for this use case
      // Alternatively, use a hash: crypto.subtle.digest('SHA-256', encoded)
      const slug = generateSlug(code);

      await env.BUILDS.put(slug, code, {
        expirationTtl: 60 * 60 * 24 * 365, // 1 year
      });

      return Response.json({ slug }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    // GET /build/{slug} — retrieve a build code
    if (request.method === 'GET' && url.pathname.startsWith('/build/')) {
      const slug = url.pathname.slice('/build/'.length);
      const code = await env.BUILDS.get(slug);
      if (!code) {
        return Response.json({ error: 'Not found' }, { status: 404 });
      }
      return Response.json({ code }, {
        headers: { 'Access-Control-Allow-Origin': '*' },
      });
    }

    return new Response('Not found', { status: 404 });
  },
};

function generateSlug(code: string): string {
  // Use a portion of the code itself as the slug (it's already URL-safe base64).
  // pobb.in does exactly this — the slug IS the full code.
  // For shorter slugs, hash it:
  return code.slice(0, 16); // Simple approach; see hash approach below
}

// Hash-based slug (more collision-resistant for short slugs):
async function generateHashSlug(code: string): Promise<string> {
  const encoded = new TextEncoder().encode(code);
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoded);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  // Take first 8 bytes, encode as URL-safe base64 → ~11 chars
  const b64 = btoa(String.fromCharCode(...hashArray.slice(0, 8)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return b64;
}
```

### wrangler.toml

```toml
name = "pob-codes"
main = "workers/save.ts"
compatibility_date = "2024-01-01"

[[kv_namespaces]]
binding = "BUILDS"
id = "YOUR_KV_NAMESPACE_ID"
```

### Deploy

```bash
npm install -g wrangler
wrangler kv:namespace create BUILDS
wrangler deploy
```

## Option B: Next.js API Routes + Vercel KV

If you're deploying on Vercel and want everything in one repo:

```bash
npm install @vercel/kv
```

```typescript
// app/api/save/route.ts
import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: Request) {
  const { code } = await request.json() as { code: string };
  if (!code || code.length > 100_000) {
    return NextResponse.json({ error: 'Invalid' }, { status: 400 });
  }

  const slug = crypto
    .createHash('sha256')
    .update(code)
    .digest('base64url')
    .slice(0, 12);

  await kv.set(`build:${slug}`, code, { ex: 60 * 60 * 24 * 365 });

  return NextResponse.json({ slug });
}
```

```typescript
// app/api/build/[slug]/route.ts
import { kv } from '@vercel/kv';
import { NextResponse } from 'next/server';

export async function GET(_req: Request, { params }: { params: { slug: string } }) {
  const code = await kv.get<string>(`build:${params.slug}`);
  if (!code) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ code });
}
```

## Option C: SQLite via Turso (simple, free, persistent)

Good if you want a full database (for analytics, build lists, etc. later):

```bash
npm install @libsql/client
```

```sql
CREATE TABLE builds (
  slug TEXT PRIMARY KEY,
  code TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch()),
  views INTEGER NOT NULL DEFAULT 0
);
```

## Next.js Page Route

```typescript
// app/builds/[slug]/page.tsx
import { decodeBuildCode } from '@/lib/decode';
import { parseBuildXml } from '@/lib/parse-xml';

interface Props {
  params: { slug: string };
}

export default async function BuildPage({ params }: Props) {
  // Fetch from your storage backend
  const res = await fetch(`${process.env.WORKER_URL}/build/${params.slug}`);
  if (!res.ok) return <div>Build not found.</div>;

  const { code } = await res.json();

  let build;
  try {
    const xml = decodeBuildCode(code);
    build = parseBuildXml(xml);
  } catch (e) {
    return <div>Failed to decode build.</div>;
  }

  return <BuildViewer build={build} />;
}

// Enable SSG for known builds, ISR for new ones
export const revalidate = 3600; // Re-render cached pages every hour
```

## Direct Code URL Support

Allow `/?code=<raw_code>` as a route — no backend needed, fully client-side:

```typescript
// app/page.tsx (or a client component)
'use client';
import { useSearchParams } from 'next/navigation';
import { decodeBuildCode } from '@/lib/decode';
import { parseBuildXml } from '@/lib/parse-xml';

export default function HomePage() {
  const params = useSearchParams();
  const code = params.get('code');

  if (code) {
    // Decode client-side
    const xml = decodeBuildCode(code);
    const build = parseBuildXml(xml);
    return <BuildViewer build={build} />;
  }

  return <PasteCodeForm />; // Landing page with a textarea to paste a code
}
```

This means pobb.in-style short URLs and direct `?code=` links both work.
