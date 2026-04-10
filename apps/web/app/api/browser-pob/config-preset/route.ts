import { resolveConfigPreset } from "../../../../lib/browser-pob/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { source?: string };
    const payload = await resolveConfigPreset(String(body.source ?? ""));
    return Response.json(payload, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Could not resolve config preset",
      },
      { status: 400 },
    );
  }
}
