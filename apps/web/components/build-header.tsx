import React from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

export function BuildHeader({ payload }: { payload: BuildPayload }) {
  return (
    <div className="panel" style={{ marginBottom: 16 }}>
      <h2>
        {payload.build.ascendClassName || payload.build.className} <span className="meta">(Level {payload.build.level})</span>
      </h2>
      <div className="meta" style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
        <span>Game: Path of Exile 1</span>
        {payload.build.targetVersion && <span>Target: {payload.build.targetVersion.replace(/_/g, ".")}</span>}
        {payload.meta.id && <span>ID: {payload.meta.id}</span>}
      </div>
    </div>
  );
}
