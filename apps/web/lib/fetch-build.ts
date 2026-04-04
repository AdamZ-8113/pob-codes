import type { BuildPayload } from "@pobcodes/shared-types";

import { buildApiUrl, getApiBase, normalizeApiBase } from "./api-base";

const API_BASE = normalizeApiBase(
  process.env.POB_CODES_API_BASE || process.env.POBB_API_BASE || getApiBase(),
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
