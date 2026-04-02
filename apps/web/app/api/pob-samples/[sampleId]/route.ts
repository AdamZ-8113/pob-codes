import { isLocalRequest } from "../../../../lib/local-host";

interface RouteContext {
  params: Promise<{
    sampleId: string;
  }>;
}

export async function GET(request: Request, context: RouteContext) {
  if (!isLocalRequest(request)) {
    return new Response("Not found", { status: 404 });
  }

  const { readSamplePobFile } = await import("../../../../lib/sample-pob-files");
  const { sampleId } = await context.params;
  const sample = readSamplePobFile(sampleId);

  if (sample === undefined) {
    return new Response("Sample build not found", { status: 404 });
  }

  return new Response(sample, {
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}
