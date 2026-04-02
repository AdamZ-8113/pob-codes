import React from "react";

import { BuildViewer } from "../../../components/build-viewer";
import { fetchBuildPayload } from "../../../lib/fetch-build";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function BuildPage({ params }: Props) {
  const { id } = await params;

  try {
    const payload = await fetchBuildPayload(id);

    return (
      <main className="build-page">
        <BuildViewer payload={payload} />
      </main>
    );
  } catch (error) {
    return (
      <main>
        <div className="error-box">
          {error instanceof Error ? error.message : "Could not load build."}
        </div>
      </main>
    );
  }
}
