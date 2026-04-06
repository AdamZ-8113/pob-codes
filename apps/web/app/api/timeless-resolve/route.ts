import type { TimelessResolveRequest, TimelessResolveResponse } from "../../../lib/timeless-resolver/types";

import { resolveTimelessBuild } from "../../../lib/timeless-resolver/resolver";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as TimelessResolveRequest | null;
  if (!body) {
    return Response.json({ error: "Invalid timeless resolve request" }, { status: 400 });
  }

  const [current, target] = await Promise.all([
    resolveTimelessBuild(body.builds.current),
    resolveTimelessBuild(body.builds.target),
  ]);

  const response: TimelessResolveResponse = {
    builds: {
      current,
      target,
    },
  };

  return Response.json(response, {
    headers: {
      "cache-control": "no-store",
    },
  });
}
