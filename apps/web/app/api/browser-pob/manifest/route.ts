import { buildBrowserPobCatalog, buildBrowserPobMountManifest } from "../../../../lib/browser-pob/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const treeVersion = url.searchParams.get("treeVersion");

  if (!treeVersion) {
    return Response.json(buildBrowserPobCatalog(), {
      headers: {
        "cache-control": "no-store",
      },
    });
  }

  return Response.json(
    buildBrowserPobMountManifest({
      treeVersion,
      includeTimeless: url.searchParams.get("timeless") === "1" || url.searchParams.get("timeless") === "true",
    }),
    {
      headers: {
        "cache-control": "no-store",
      },
    },
  );
}
