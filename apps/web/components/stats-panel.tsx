import React from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import { formatDisplayValue } from "../lib/format-value";
import {
  buildMinionStatRowsForDisplay,
  buildPlayerStatRowsForDisplay,
} from "../lib/pob-stat-layout";

interface StatsPanelProps {
  payload: BuildPayload;
}

export function StatsPanel({ payload }: StatsPanelProps) {
  const playerRows = buildPlayerStatRowsForDisplay(payload);
  const minionRows = buildMinionStatRowsForDisplay(payload);
  const fullDpsBreakdown = buildFullDpsBreakdownRows(payload);

  return (
    <section className="panel pob-stats-panel">
      <h2>Stats</h2>

      <div className="pob-stat-list">
        {playerRows.map((row, index) => (
          <React.Fragment key={`player-stat:${row.key}:${index}`}>
            <div
              className={`pob-stat-row${row.gapBefore ? " pob-stat-row-gap" : ""}`}
              style={row.color ? ({ "--pob-stat-color": row.color } as React.CSSProperties) : undefined}
            >
              <span className="pob-stat-label">{row.label}:</span>
              <span className="pob-stat-value">{row.value}</span>
            </div>
            {row.key === "FullDPS" && fullDpsBreakdown.length > 0 && (
              <div className="pob-full-dps-details">
                {fullDpsBreakdown.map((detail) => (
                  <div className="pob-full-dps-detail" key={`full-dps:${detail.key}`}>
                    <div className="pob-full-dps-detail-row">
                      <span className="pob-full-dps-detail-label">{detail.label}:</span>
                      <span className="pob-full-dps-detail-value">{detail.value}</span>
                    </div>
                    {detail.skillPart && <div className="pob-full-dps-detail-meta">{detail.skillPart}</div>}
                    {detail.source && <div className="pob-full-dps-detail-source">from {detail.source}</div>}
                  </div>
                ))}
              </div>
            )}
          </React.Fragment>
        ))}
      </div>

      {minionRows.length > 0 && (
        <>
          <div className="pob-section-header">Minion</div>
          <div className="pob-stat-list">
            {minionRows.map((row, index) => (
              <div
                className={`pob-stat-row${row.gapBefore ? " pob-stat-row-gap" : ""}`}
                key={`minion-stat:${row.key}:${index}`}
                style={row.color ? ({ "--pob-stat-color": row.color } as React.CSSProperties) : undefined}
              >
                <span className="pob-stat-label">{row.label}:</span>
                <span className="pob-stat-value">{row.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}

interface FullDpsBreakdownRow {
  key: string;
  label: string;
  source?: string;
  skillPart?: string;
  value: string;
}

function buildFullDpsBreakdownRows(payload: BuildPayload): FullDpsBreakdownRow[] {
  if (!payload.stats.player.FullDPS || payload.stats.fullDpsSkills.length === 0) {
    return [];
  }

  return payload.stats.fullDpsSkills.map((row, index) => ({
    key: `${row.stat}:${row.source ?? ""}:${row.skillPart ?? ""}:${index}`,
    label: row.stat,
    source: row.source?.trim() || undefined,
    skillPart: row.skillPart?.trim() || undefined,
    value: formatFullDpsBreakdownValue(row.value),
  }));
}

function formatFullDpsBreakdownValue(value: string) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return formatDisplayValue(value);
  }

  return formatDisplayValue(Math.round(numeric));
}
