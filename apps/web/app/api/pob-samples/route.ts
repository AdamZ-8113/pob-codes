import { isLocalRequest } from "../../../lib/local-host";

export async function GET(request: Request) {
  if (!isLocalRequest(request)) {
    return new Response("Not found", { status: 404 });
  }

  const { listSamplePobFiles } = await import("../../../lib/sample-pob-files");
  const samples = listSamplePobFiles();

  return Response.json(
    { samples },
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
