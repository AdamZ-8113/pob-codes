import { loadPoeCharacters } from "../../../../lib/browser-pob/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      realm?: string;
      accountName?: string;
    };
    const payload = await loadPoeCharacters({
      realm: body.realm,
      accountName: String(body.accountName ?? ""),
    });
    return Response.json(payload, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not load account characters";
    const lowered = message.toLowerCase();
    const status =
      lowered.includes("private") ? 403
      : lowered.includes("incorrect") ? 404
      : lowered.includes("required") ? 400
      : 502;

    return Response.json({ error: message }, { status });
  }
}
