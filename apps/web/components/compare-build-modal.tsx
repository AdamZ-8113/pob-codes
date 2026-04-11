"use client";

import { useEffect, useMemo, useState } from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import {
  compareBuildAgainstInput,
  DEFAULT_COMPARE_ENGINE,
  type BuildCompareEngine,
  type BuildCompareReport,
} from "../lib/build-compare";
import type { BuildViewerSelection } from "../lib/build-viewer-selection";

interface CompareBuildModalProps {
  payload: BuildPayload;
  selection: BuildViewerSelection;
}

const COMPARE_ENGINE_STORAGE_KEY = "pobcodes.compare.engine.v2";
const ITEM_CATEGORY_ORDER = ["unique", "rare", "flask", "cluster-jewel", "regular-jewel", "other"] as const;
const ITEM_CATEGORY_TITLES: Record<(typeof ITEM_CATEGORY_ORDER)[number], string> = {
  "cluster-jewel": "Cluster Jewel Differences",
  flask: "Flask Differences",
  other: "Other Item Differences",
  rare: "Rare Item Differences",
  "regular-jewel": "Regular Jewel Differences",
  unique: "Unique Item Differences",
};

export function CompareBuildModal({ payload, selection }: CompareBuildModalProps) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<BuildCompareReport | null>(null);
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [engine, setEngine] = useState<BuildCompareEngine>(() => readPreferredCompareEngine());
  const [showComparedBuildExtras, setShowComparedBuildExtras] = useState(false);
  const [showEngineSelector, setShowEngineSelector] = useState(false);
  const [collapsedFindingKeys, setCollapsedFindingKeys] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const hasEngineOverride = isBuildCompareEngine(params.get("compareEngine"));
    const storedEngine = readStoredCompareEngine();
    setShowEngineSelector(process.env.NODE_ENV === "development" || hasEngineOverride || storedEngine !== undefined);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.setItem(COMPARE_ENGINE_STORAGE_KEY, engine);
  }, [engine]);

  async function handleCompare() {
    const trimmed = input.trim();
    if (!trimmed) {
      setError("Paste a Path of Building code or supported build URL first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const nextReport = await compareBuildAgainstInput(payload, selection, trimmed, { engine });
      setReport(nextReport);
      setCollapsedFindingKeys(new Set());
      setInputCollapsed(true);
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : "Compare failed");
    } finally {
      setLoading(false);
    }
  }

  const visibleFindings = useMemo(
    () => (report ? filterVisibleCompareFindings(report, showComparedBuildExtras) : []),
    [report, showComparedBuildExtras],
  );
  const hasHiddenComparedBuildOnlyRows = report ? report.findings.some(hasComparedBuildOnlyItemRows) : false;

  return (
    <>
      <button
        className="btn btn-secondary build-compare-button"
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        <b>Compare A Build</b>
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
              <h2>Compare my PoB</h2>
              <button className="btn btn-secondary compare-modal-close" type="button" onClick={() => setOpen(false)}>
                Close
              </button>
            </div>
            <p className="meta compare-modal-copy">
              Paste a Path of Building code or supported build URL. The comparison looks for major build gaps instead of
              diffing every exported stat.
            </p>
            {showEngineSelector ? (
              <label className="compare-modal-actions" htmlFor="compare-engine-select">
                <span className="meta">Compare engine</span>
                <select
                  className="compare-modal-source-field"
                  id="compare-engine-select"
                  value={engine}
                  onChange={(event) => {
                    const nextEngine = parseCompareEngine(event.target.value);
                    setEngine(nextEngine);
                  }}
                >
                  <option value="stable">Stable</option>
                  <option value="v2">Experimental v2</option>
                </select>
              </label>
            ) : null}
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
                {hasHiddenComparedBuildOnlyRows ? (
                  <label className="compare-modal-actions" htmlFor="compare-show-own-items">
                    <input
                      checked={showComparedBuildExtras}
                      id="compare-show-own-items"
                      type="checkbox"
                      onChange={(event) => setShowComparedBuildExtras(event.target.checked)}
                    />
                    <span className="meta">Show items and mods only found in my build</span>
                  </label>
                ) : null}
                {visibleFindings.length > 0 ? (
                  visibleFindings.map((finding) => (
                    <section
                      className={`compare-finding compare-finding--${finding.severity} ${finding.kind === "item" ? "compare-finding--item" : ""}`}
                      key={`compare-finding:${finding.key}`}
                    >
                      <h3 className="compare-finding-title">
                        <button
                          aria-controls={`compare-finding-panel:${finding.key}`}
                          aria-expanded={!collapsedFindingKeys.has(finding.key)}
                          className="compare-finding-toggle"
                          type="button"
                          onClick={() => {
                            setCollapsedFindingKeys((current) => {
                              const next = new Set(current);
                              if (next.has(finding.key)) {
                                next.delete(finding.key);
                              } else {
                                next.add(finding.key);
                              }
                              return next;
                            });
                          }}
                        >
                          <span>{finding.title}</span>
                          <span className="compare-finding-toggle-icon">{collapsedFindingKeys.has(finding.key) ? "+" : "-"}</span>
                        </button>
                      </h3>
                      {!collapsedFindingKeys.has(finding.key) ? (
                        renderCompareFindingTable(finding)
                      ) : null}
                    </section>
                  ))
                ) : (
                  <div className="compare-report-empty">
                    {hasHiddenComparedBuildOnlyRows && !showComparedBuildExtras
                      ? "No obvious source-build gaps were detected. Enable the checkbox to show items and mods only found in your build."
                      : "No obvious high-signal gaps were detected from the exported data."}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}

function readPreferredCompareEngine(): BuildCompareEngine {
  if (typeof window === "undefined") {
    return DEFAULT_COMPARE_ENGINE;
  }

  const params = new URLSearchParams(window.location.search);
  const queryEngine = params.get("compareEngine");
  if (isBuildCompareEngine(queryEngine)) {
    return queryEngine;
  }

  return readStoredCompareEngine() ?? DEFAULT_COMPARE_ENGINE;
}

function readStoredCompareEngine(): BuildCompareEngine | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  return parseStoredCompareEngine(window.localStorage.getItem(COMPARE_ENGINE_STORAGE_KEY));
}

function parseStoredCompareEngine(value: string | null): BuildCompareEngine | undefined {
  return isBuildCompareEngine(value) ? value : undefined;
}

function parseCompareEngine(value: string): BuildCompareEngine {
  return isBuildCompareEngine(value) ? value : DEFAULT_COMPARE_ENGINE;
}

function isBuildCompareEngine(value: string | null | undefined): value is BuildCompareEngine {
  return value === "stable" || value === "v2";
}

function filterVisibleCompareFindings(report: BuildCompareReport, showComparedBuildExtras: boolean): BuildCompareReport["findings"] {
  const filteredFindings = report.findings
    .map((finding) => ({
      ...finding,
      rows: finding.rows.filter((row) => showComparedBuildExtras || !shouldHideComparedBuildOnlyRow(finding.kind, row.direction)),
    }))
    .filter((finding) => finding.rows.length > 0);

  return regroupItemFindings(filteredFindings);
}

function hasComparedBuildOnlyItemRows(finding: BuildCompareReport["findings"][number]) {
  return finding.rows.some((row) => shouldHideComparedBuildOnlyRow(finding.kind, row.direction));
}

function shouldHideComparedBuildOnlyRow(
  kind: BuildCompareReport["findings"][number]["kind"],
  direction: BuildCompareReport["findings"][number]["rows"][number]["direction"],
) {
  return kind === "item" && direction === "target-only";
}

function renderCompareFindingTable(finding: BuildCompareReport["findings"][number]) {
  if (finding.key === "missing-support-gems") {
    return (
      <div className="compare-finding-table compare-finding-table--support-gems" id={`compare-finding-panel:${finding.key}`}>
        <div className="compare-finding-table-row compare-finding-table-row--header compare-finding-table-row--support-gems">
          <div className="compare-finding-cell compare-finding-cell--name">Support Gem</div>
          <div className="compare-finding-cell compare-finding-cell--support-skills">Supported Skills</div>
          <div className="compare-finding-cell compare-finding-cell--current">Source Gem Level & Quality</div>
          <div className="compare-finding-cell compare-finding-cell--target">Your Build Gem Level & Quality</div>
        </div>
        {finding.rows.map((row) => (
          <div
            className={`compare-finding-table-row compare-finding-table-row--support-gems ${row.highlight ? "compare-finding-table-row--highlight" : ""}`}
            key={`${finding.key}:${row.key}`}
          >
            <div className="compare-finding-cell compare-finding-cell--name" data-mobile-label="Support Gem">
              {row.nameDisplay?.type === "support-link-group" ? row.nameDisplay.supportName : row.name}
            </div>
            <div className="compare-finding-cell compare-finding-cell--support-skills" data-mobile-label="Supported Skills">
              {row.nameDisplay?.type === "support-link-group" ? row.nameDisplay.skillNames.join("\n") : ""}
            </div>
            <div className="compare-finding-cell compare-finding-cell--current" data-mobile-label="Source Gem Level & Quality">
              {row.currentValue}
            </div>
            <div className="compare-finding-cell compare-finding-cell--target" data-mobile-label="Your Build Gem Level & Quality">
              {row.targetValue}
            </div>
          </div>
        ))}
      </div>
    );
  }

  const currentHeader = finding.key === "elegant-hubris-notables" ? "Only in Source Build" : "Source Build";
  const targetHeader = finding.key === "elegant-hubris-notables" ? "Only in Your Build" : "Your Build";

  return (
    <div className="compare-finding-table" id={`compare-finding-panel:${finding.key}`}>
      <div className="compare-finding-table-row compare-finding-table-row--header">
        <div className="compare-finding-cell compare-finding-cell--name">Compared field</div>
        <div className="compare-finding-cell compare-finding-cell--current">{currentHeader}</div>
        <div className="compare-finding-cell compare-finding-cell--target">{targetHeader}</div>
      </div>
      {finding.rows.map((row) => (
        <div
          className={`compare-finding-table-row ${row.highlight ? "compare-finding-table-row--highlight" : ""}`}
          key={`${finding.key}:${row.key}`}
        >
          <div className="compare-finding-cell compare-finding-cell--name" data-mobile-label="Compared field">
            {row.name}
          </div>
          <div className="compare-finding-cell compare-finding-cell--current" data-mobile-label={currentHeader}>
            {row.currentValue}
          </div>
          <div className="compare-finding-cell compare-finding-cell--target" data-mobile-label={targetHeader}>
            {row.targetValue}
          </div>
        </div>
      ))}
    </div>
  );
}

function regroupItemFindings(findings: BuildCompareReport["findings"]) {
  const groupedItemFindings = buildGroupedItemFindings(findings);
  if (groupedItemFindings.length === 0) {
    return findings;
  }

  const result: BuildCompareReport["findings"] = [];
  let insertedGroupedItems = false;

  for (const finding of findings) {
    if (finding.kind === "item") {
      if (!insertedGroupedItems) {
        result.push(...groupedItemFindings);
        insertedGroupedItems = true;
      }
      continue;
    }

    result.push(finding);
  }

  return result;
}

function buildGroupedItemFindings(findings: BuildCompareReport["findings"]) {
  const rowsByCategory = new Map<(typeof ITEM_CATEGORY_ORDER)[number], BuildCompareReport["findings"][number]["rows"]>();

  for (const finding of findings) {
    if (finding.kind !== "item") {
      continue;
    }

    for (const row of finding.rows) {
      const category = row.itemCategory ?? "other";
      const rows = rowsByCategory.get(category) ?? [];
      rows.push(row);
      rowsByCategory.set(category, rows);
    }
  }

  return ITEM_CATEGORY_ORDER.flatMap((category) => {
    const rows = rowsByCategory.get(category);
    if (!rows || rows.length === 0) {
      return [];
    }

    const severity: "major" | "notable" = rows.some((row) => row.key.startsWith("item:")) ? "major" : "notable";

    return [
      {
        kind: "item" as const,
        key: `item-category:${category}`,
        rows,
        severity,
        title: ITEM_CATEGORY_TITLES[category],
      },
    ];
  });
}
