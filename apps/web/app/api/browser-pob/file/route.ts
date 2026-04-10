import fs from "node:fs";
import path from "node:path";

import { readBrowserPobGeneratedTimelessFile, resolveBrowserPobFile } from "../../../../lib/browser-pob/server";

function getContentType(fullPath: string) {
  const extension = path.extname(fullPath).toLowerCase();
  return extension === ".lua" || extension === ".txt" || extension === ".xml"
    ? "text/plain; charset=utf-8"
    : "application/octet-stream";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const kind = url.searchParams.get("kind");
  const sourcePath = url.searchParams.get("path");

  if (!kind || !sourcePath) {
    return new Response("Missing kind or path query parameter", { status: 400 });
  }

  if (kind === "generated-timeless-bin") {
    const buffer = readBrowserPobGeneratedTimelessFile(sourcePath);
    if (!buffer) {
      return new Response("Generated timeless jewel payload not found", { status: 404 });
    }

    return new Response(new Uint8Array(buffer), {
      headers: {
        "cache-control": "public, max-age=31536000, immutable",
        "content-type": "application/octet-stream",
      },
    });
  }

  const fullPath = resolveBrowserPobFile(kind, sourcePath);
  if (!fullPath) {
    return new Response("File not found", { status: 404 });
  }

  return new Response(fs.readFileSync(fullPath), {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type": getContentType(fullPath),
    },
  });
}
