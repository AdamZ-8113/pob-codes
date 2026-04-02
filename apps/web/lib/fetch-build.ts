import type { BuildPayload } from "@pobcodes/shared-types";

import { buildApiUrl, normalizeApiBase } from "./api-base";

const API_BASE = normalizeApiBase(
  process.env.POB_CODES_API_BASE || process.env.POBB_API_BASE || process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8787",
);

export async function fetchBuildPayload(id: string): Promise<BuildPayload> {
  const url = buildApiUrl(`/${encodeURIComponent(id)}/json`, API_BASE);
  const res = await fetch(url, {
    next: { revalidate: 60 },
  });

  if (!res.ok) {
    throw new Error(`Could not load build (${res.status})`);
  }

  return (await res.json()) as BuildPayload;
}
