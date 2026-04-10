import { loadPoeCharacterImport } from "../../../../lib/browser-pob/server";

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as {
      realm?: string;
      accountName?: string;
      characterName?: string;
    };
    const payload = await loadPoeCharacterImport({
      realm: body.realm,
      accountName: String(body.accountName ?? ""),
      characterName: String(body.characterName ?? ""),
    });
    return Response.json(payload, {
      headers: {
        "cache-control": "no-store",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not import character";
    return Response.json({ error: message }, { status: 502 });
  }
}
