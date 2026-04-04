"use client";

import { useState } from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import { compareBuildAgainstInput, type BuildCompareReport } from "../lib/build-compare";
import type { BuildViewerSelection } from "../lib/build-viewer-selection";

interface CompareBuildModalProps {
  payload: BuildPayload;
  selection: BuildViewerSelection;
}

export function CompareBuildModal({ payload, selection }: CompareBuildModalProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BuildCompareReport | null>(null);
  const [inputCollapsed, setInputCollapsed] = useState(false);

  async function handleCompare() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Paste a Path of Building code or supported build URL first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextReport = await compareBuildAgainstInput(payload, selection, trimmed);
      setReport(nextReport);
      setInputCollapsed(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Compare failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="btn btn-secondary build-compare-button"
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Compare my POB
      </button>
      {open && (
        <div
          className="compare-modal-backdrop"
          onClick={() => {
            if (loading) {
              return;
            }
            setOpen(false);
          }}
        >
          <div
            className="panel compare-modal"
            onClick={(event) => {
              event.stopPropagation();
            }}
          >
            <div className="panel-toolbar compare-modal-toolbar">
              <h2>Compare my POB</h2>
              <button className="btn btn-secondary compare-modal-close" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <p className="meta compare-modal-copy">
              Paste a Path of Building code or supported build URL. The comparison looks for major build gaps instead of
              diffing every exported stat.
            </p>
            {inputCollapsed && report ? (
              <div className="compare-modal-source-row">
                <input className="compare-modal-source-field" readOnly type="text" value={input.trim()} />
                <button className="btn btn-secondary" type="button" onClick={() => setInputCollapsed(false)}>
                  Edit source
                </button>
              </div>
            ) : (
              <>
                <textarea
                  className="code-area compare-modal-input"
                  placeholder="Paste a Path of Building code, pob.codes or pobb.in link, Maxroll link, Maxroll planner, Pastebin, poe.ninja, or similar..."
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                />
                <div className="compare-modal-actions">
                  <button className="btn" disabled={loading} type="button" onClick={handleCompare}>
                    {loading ? "Comparing..." : "Compare Builds"}
                  </button>
                </div>
              </>
            )}
            {error && <div className="error-box compare-modal-error">{error}</div>}
            {report && (
              <div className="compare-report">
                <div className="compare-report-summary">Compared against {report.targetSummary}</div>
                {report.findings.length > 0 ? (
                  report.findings.map((finding) => (
                    <section
                      className={`compare-finding compare-finding--${finding.severity} ${finding.kind === "item" ? "compare-finding--item" : ""}`}
                      key={`compare-finding:${finding.key}`}
                    >
                      <h3>{finding.title}</h3>
                      <div className="compare-finding-table">
                        <div className="compare-finding-table-row compare-finding-table-row--header">
                          <div className="compare-finding-cell compare-finding-cell--name">Compared field</div>
                          <div className="compare-finding-cell compare-finding-cell--current">Current build</div>
                          <div className="compare-finding-cell compare-finding-cell--target">Compared build</div>
                        </div>
                        {finding.rows.map((row) => (
                          <div
                            className={`compare-finding-table-row ${row.highlight ? "compare-finding-table-row--highlight" : ""}`}
                            key={`${finding.key}:${row.key}`}
                          >
                            <div className="compare-finding-cell compare-finding-cell--name" data-mobile-label="Compared field">
                              {row.name}
                            </div>
                            <div
                              className="compare-finding-cell compare-finding-cell--current"
                              data-mobile-label="Current build"
                            >
                              {row.currentValue}
                            </div>
                            <div
                              className="compare-finding-cell compare-finding-cell--target"
                              data-mobile-label="Compared build"
                            >
                              {row.targetValue}
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))
                ) : (
                  <div className="compare-report-empty">No obvious high-signal gaps were detected from the exported data.</div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
