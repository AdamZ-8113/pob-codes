import React from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import { getConfigSetLabel, getSelectedConfigSet } from "../lib/build-viewer-selection";
import { formatDisplayValue } from "../lib/format-value";

interface NotesConfigPanelProps {
  payload: BuildPayload;
  configSetId?: number;
  onConfigSetChange?: (configSetId: number) => void;
}

export function NotesConfigPanel({ configSetId, onConfigSetChange, payload }: NotesConfigPanelProps) {
  const activeConfigSet = getSelectedConfigSet(payload, configSetId);
  const configEntries = Object.entries(activeConfigSet?.inputs ?? payload.config);
  const hasNotes = payload.notes.trim().length > 0;

  return (
    <section className="panel">
      <div className="panel-toolbar">
        <h2>Notes & Config</h2>
        {payload.configSets.length > 1 && (
          <select
            aria-label="Config Set"
            className="panel-select"
            value={activeConfigSet?.id ?? ""}
            onChange={(event) => onConfigSetChange?.(Number(event.target.value))}
          >
            {payload.configSets.map((configSet, index) => (
              <option key={`config-set:${configSet.id}`} value={configSet.id}>
                {getConfigSetLabel(index, configSet.title)}
              </option>
            ))}
          </select>
        )}
      </div>

      {hasNotes ? (
        <pre className="notes-block">{payload.notes}</pre>
      ) : (
        <div className="meta" style={{ marginBottom: 12 }}>
          No notes exported.
        </div>
      )}

      <div className="list">
        {configEntries.length > 0 ? (
          configEntries.map(([name, value]) => (
            <div className="item-box" key={`config:${name}`}>
              <strong>{name}</strong>
              <div className="meta">{formatDisplayValue(value)}</div>
            </div>
          ))
        ) : (
          <div className="meta">No config inputs exported for this config set.</div>
        )}
      </div>
    </section>
  );
}
