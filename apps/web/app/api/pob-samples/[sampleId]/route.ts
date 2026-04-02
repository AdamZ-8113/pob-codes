import { readSamplePobFile } from "../../../../lib/sample-pob-files";

interface RouteContext {
  params: Promise<{
    sampleId: string;
  }>;
}

export async function GET(_: Request, context: RouteContext) {
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
