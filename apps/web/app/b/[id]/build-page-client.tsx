"use client";

import type { BuildPayload } from "@pobcodes/shared-types";
import React, { startTransition, useEffect, useState } from "react";

import { BuildViewer } from "../../../components/build-viewer";
import { fetchBuildPayloadClient } from "../../../lib/fetch-build";

type BuildPageClientState =
  | { status: "loading" }
  | { status: "ready"; payload: BuildPayload }
  | { status: "error"; message: string };

export function BuildPageClient({ id }: { id: string }) {
  const [state, setState] = useState<BuildPageClientState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();

    startTransition(() => {
      setState({ status: "loading" });
    });

    void (async () => {
      try {
        const payload = await fetchBuildPayloadClient(id, controller.signal);
        if (controller.signal.aborted) {
          return;
        }

        startTransition(() => {
          setState({
            status: "ready",
            payload,
          });
        });
      } catch (error) {
        if (controller.signal.aborted) {
          return;
        }

        startTransition(() => {
          setState({
            status: "error",
            message: error instanceof Error ? error.message : "Could not load build.",
          });
        });
      }
    })();

    return () => {
      controller.abort();
    };
  }, [id]);

  if (state.status === "loading") {
    return (
      <section className="panel" aria-live="polite" role="status">
        Loading build...
      </section>
    );
  }

  if (state.status === "error") {
    return <div className="error-box">{state.message}</div>;
  }

  return <BuildViewer payload={state.payload} />;
}
