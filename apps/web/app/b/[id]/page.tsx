import React from "react";

import { BuildPageClient } from "./build-page-client";
import { BuildViewer } from "../../../components/build-viewer";
import { fetchBuildPayload } from "../../../lib/fetch-build";

interface Props {
  params: Promise<{ id: string }>;
}

function isBuildPageClientFetchEnabled() {
  const value = process.env.BUILD_PAGE_CLIENT_FETCH_ENABLED?.trim().toLowerCase();
  if (!value) {
    return true;
  }

  return !["0", "false", "no", "off"].includes(value);
}

async function renderBuildPageServerContent(id: string) {
  try {
    const payload = await fetchBuildPayload(id);

    return <BuildViewer payload={payload} />;
  } catch (error) {
    return (
      <div className="error-box">
        {error instanceof Error ? error.message : "Could not load build."}
      </div>
    );
  }
}

export default async function BuildPage({ params }: Props) {
  const { id } = await params;

  return (
    <main className="build-page">
      {isBuildPageClientFetchEnabled()
        ? <BuildPageClient id={id} />
        : await renderBuildPageServerContent(id)}
    </main>
  );
}
