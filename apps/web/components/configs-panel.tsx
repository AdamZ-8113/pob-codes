"use client";

import React from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import { getConfigSetLabel, getSelectedConfigSet } from "../lib/build-viewer-selection";
import { buildConfigDisplaySections, compactConfigDisplaySections } from "../lib/pob-config-display";

interface ConfigsPanelProps {
  payload: BuildPayload;
  configSetId?: number;
  onConfigSetChange?: (configSetId: number) => void;
}

export function ConfigsPanel({ configSetId, onConfigSetChange, payload }: ConfigsPanelProps) {
  const activeConfigSet = getSelectedConfigSet(payload, configSetId);
  const sections = compactConfigDisplaySections(buildConfigDisplaySections(activeConfigSet?.inputs ?? payload.config));
  const hasEntries = sections.length > 0;

  return (
    <section className="panel config-summary-panel">
      <div className="panel-toolbar">
        <h2>Configs</h2>
        {payload.configSets.length > 1 && activeConfigSet ? (
          <select
            aria-label="Config Set"
            className="panel-select"
            value={activeConfigSet.id}
            onChange={(event) => onConfigSetChange?.(Number(event.target.value))}
          >
            {payload.configSets.map((configSet, index) => (
              <option key={`config-set:${configSet.id}`} value={configSet.id}>
                {getConfigSetLabel(index, configSet.title)}
              </option>
            ))}
          </select>
        ) : null}
      </div>

      {!hasEntries ? (
        <div className="meta">No non-default config inputs exported for this config set.</div>
      ) : (
        <div className="config-summary-grid">
          {sections.map((section) => (
            <section className="config-summary-section" key={section.key}>
              <div className="config-summary-heading">{section.title}</div>
              <div className="config-summary-rows">
                {section.rows.map((row) => (
                  <div className={`config-summary-row config-summary-row--${row.type}`} key={row.key}>
                    {row.type === "toggle" ? (
                      <>
                        <span className="config-summary-label">{row.label}</span>
                        <span className="config-summary-check" aria-hidden="true">
                          ✓
                        </span>
                      </>
                    ) : row.type === "custom" ? (
                      <span className="config-summary-custom-line">{row.label}</span>
                    ) : (
                      <>
                        <span className="config-summary-label">{row.label}</span>
                        <span className="config-summary-value">{row.value}</span>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </section>
  );
}
