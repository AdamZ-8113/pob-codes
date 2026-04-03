"use client";

import React, { useEffect, useMemo, useState } from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import {
  applyBuildLoadout,
  findMatchingBuildLoadout,
  getBuildLoadouts,
  getInitialBuildViewerSelection,
  type BuildViewerSelection,
} from "../lib/build-viewer-selection";
import { buildApiUrl } from "../lib/api-base";
import { getSecondaryAscendancyName } from "../lib/ascendancy-names";
import {
  buildBuildSummaryEntries,
  buildLoadoutTitle,
  buildRecentBuildSnapshot,
  resolveBuildPatchVersion,
} from "../lib/build-overview";
import { copyTextToClipboard } from "../lib/clipboard";
import { recordRecentBuild } from "../lib/recent-builds";
import { isWeaponSwapSlot } from "../lib/weapon-swap";
import { CompareBuildModal } from "./compare-build-modal";
import { ConfigsPanel } from "./configs-panel";
import { ItemsPanel } from "./items-panel";
import { NotesPanel } from "./notes-panel";
import { PassiveTreePanel } from "./passive-tree-panel";
import { SkillsPanel } from "./skills-panel";
import { StatsPanel } from "./stats-panel";

export function BuildViewer({ payload }: { payload: BuildPayload }) {
  const [selection, setSelection] = useState<BuildViewerSelection>(() => getInitialBuildViewerSelection(payload));
  const [showWeaponSwap, setShowWeaponSwap] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ message: string; nonce: number } | null>(null);
  const [useMobileStatsPlacement, setUseMobileStatsPlacement] = useState(false);
  const recentBuildId = payload.meta.id?.trim();
  const loadouts = useMemo(() => getBuildLoadouts(payload), [payload]);
  const selectedLoadout = useMemo(() => findMatchingBuildLoadout(payload, selection), [payload, selection]);
  const activeTree = payload.treeSpecs[selection.treeIndex] ?? payload.treeSpecs[payload.activeTreeIndex];
  const bloodlineAscendancyName = getSecondaryAscendancyName(activeTree?.secondaryAscendancyId);
  const recentBuildSnapshot = useMemo(() => buildRecentBuildSnapshot(payload), [payload]);
  const loadoutTitle = useMemo(
    () => buildLoadoutTitle(payload, selection.skillSetId, bloodlineAscendancyName),
    [payload, selection.skillSetId, bloodlineAscendancyName],
  );
  const loadoutPatchVersion = useMemo(() => resolveBuildPatchVersion(payload, selection.treeIndex), [payload, selection.treeIndex]);
  const summary = useMemo(() => buildBuildSummaryEntries(payload, selection.skillSetId), [payload, selection.skillSetId]);
  const summaryPrimaryMetrics = useMemo(
    () => summary.metrics.filter((entry) => entry.tone !== "dps"),
    [summary.metrics],
  );
  const summaryDpsMetrics = useMemo(
    () => summary.metrics.filter((entry) => entry.tone === "dps"),
    [summary.metrics],
  );
  const hasWeaponSwapContent = useMemo(
    () =>
      payload.itemSets.some((set) => set.slots.some((slot) => isWeaponSwapSlot(slot.name))) ||
      payload.skillSets.some((set) => set.groups.some((group) => isWeaponSwapSlot(group.slot))),
    [payload],
  );

  useEffect(() => {
    setSelection(getInitialBuildViewerSelection(payload));
    setShowWeaponSwap(false);
  }, [payload]);

  useEffect(() => {
    if (copyFeedback === null) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setCopyFeedback(null);
    }, 1000);

    return () => window.clearTimeout(timeoutId);
  }, [copyFeedback]);

  useEffect(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return;
    }

    const narrowViewport = window.matchMedia("(max-width: 1180px)");
    const coarsePointer = window.matchMedia("(pointer: coarse)");
    const noHover = window.matchMedia("(hover: none)");

    const updateLayoutMode = () => {
      const userAgent = window.navigator.userAgent;
      const looksMobile =
        coarsePointer.matches ||
        noHover.matches ||
        window.navigator.maxTouchPoints > 0 ||
        /Android|iPhone|iPad|iPod|Mobile/i.test(userAgent);

      setUseMobileStatsPlacement(narrowViewport.matches && looksMobile);
    };

    updateLayoutMode();
    narrowViewport.addEventListener("change", updateLayoutMode);
    coarsePointer.addEventListener("change", updateLayoutMode);
    noHover.addEventListener("change", updateLayoutMode);

    return () => {
      narrowViewport.removeEventListener("change", updateLayoutMode);
      coarsePointer.removeEventListener("change", updateLayoutMode);
      noHover.removeEventListener("change", updateLayoutMode);
    };
  }, []);

  useEffect(() => {
    if (!recentBuildId) {
      return;
    }

    recordRecentBuild({
      dps: recentBuildSnapshot.dps,
      ehp: recentBuildSnapshot.ehp,
      id: recentBuildId,
      level: recentBuildSnapshot.level,
      patchVersion: recentBuildSnapshot.patchVersion,
      title: recentBuildSnapshot.title || recentBuildId,
    });
  }, [recentBuildId, recentBuildSnapshot]);

  async function handleShareBuild() {
    const shareUrl = getBuildShareUrl(payload);
    if (!shareUrl) {
      return;
    }

    try {
      await copyTextToClipboard(shareUrl);
      setCopyFeedback({
        message: "Share URL copied to clipboard",
        nonce: Date.now(),
      });
    } catch {
      // Ignore clipboard failures in unsupported browser contexts.
    }
  }

  async function handleCopyFullPobCode() {
    const rawUrl = getBuildRawUrl(payload);
    if (!rawUrl) {
      return;
    }

    try {
      const response = await fetch(rawUrl, {
        cache: "no-store",
      });
      if (!response.ok) {
        return;
      }

      const rawCode = (await response.text()).trim();
      if (!rawCode) {
        return;
      }

      await copyTextToClipboard(rawCode);
      setCopyFeedback({
        message: "Full PoB code copied to clipboard",
        nonce: Date.now(),
      });
    } catch {
      // Ignore clipboard and network failures in unsupported browser contexts.
    }
  }

  return (
    <div className="build-layout">
      {copyFeedback !== null && (
        <div key={copyFeedback.nonce} className="item-copy-toast" role="status" aria-live="polite">
          {copyFeedback.message}
        </div>
      )}
      {!useMobileStatsPlacement && (
        <div className="build-layout-sidebar">
          <StatsPanel payload={payload} />
        </div>
      )}
      <div className="build-layout-main">
        <section className="panel build-loadout-panel">
          <div className="build-loadout-summary">
            <div className="build-loadout-title-row">
              <div className="build-loadout-title">
                {loadoutTitle}
                {payload.build.level ? <span className="meta"> (Level {payload.build.level})</span> : null}
              </div>
              {loadoutPatchVersion ? <div className="build-loadout-version">{loadoutPatchVersion}</div> : null}
            </div>
            {(summaryPrimaryMetrics.length > 0 || summaryDpsMetrics.length > 0) && (
              <div className="build-loadout-stats">
                {summaryPrimaryMetrics.length > 0 && (
                  <div className="build-loadout-stats-line">
                    {summaryPrimaryMetrics.map((entry) => (
                      <span
                        className={`build-loadout-stat build-loadout-stat--${entry.tone}`}
                        key={`build-summary:${entry.key}`}
                      >
                        <span className="build-loadout-stat-label">{entry.label}:</span>
                        <span className="build-loadout-stat-value">{entry.value}</span>
                        {entry.annotation && <span className="build-loadout-stat-annotation">({entry.annotation})</span>}
                      </span>
                    ))}
                    {summaryDpsMetrics.length === 0 && summary.resistances.length > 0 && (
                      <span className="build-loadout-stat build-loadout-stat--resistances">
                        <span className="build-loadout-stat-label">Resistances:</span>
                        <span className="build-loadout-resistances">
                          {summary.resistances.map((entry, index) => (
                            <React.Fragment key={`build-resistance:${entry.key}`}>
                              {index > 0 && <span className="build-loadout-resistance-separator">/</span>}
                              <span className={`build-loadout-resistance build-loadout-stat--${entry.tone}`}>
                                {entry.value}
                              </span>
                            </React.Fragment>
                          ))}
                        </span>
                      </span>
                    )}
                  </div>
                )}
                {summaryDpsMetrics.length > 0 && (
                  <div className="build-loadout-stats-line">
                    {summaryDpsMetrics.map((entry) => (
                      <span
                        className={`build-loadout-stat build-loadout-stat--${entry.tone}`}
                        key={`build-summary:${entry.key}`}
                      >
                        <span className="build-loadout-stat-label">{entry.label}:</span>
                        <span className="build-loadout-stat-value">{entry.value}</span>
                        {entry.annotation && <span className="build-loadout-stat-annotation">({entry.annotation})</span>}
                      </span>
                    ))}
                    {summary.resistances.length > 0 && (
                      <span className="build-loadout-stat build-loadout-stat--resistances">
                        <span className="build-loadout-stat-label">Resistances:</span>
                        <span className="build-loadout-resistances">
                          {summary.resistances.map((entry, index) => (
                            <React.Fragment key={`build-resistance:${entry.key}`}>
                              {index > 0 && <span className="build-loadout-resistance-separator">/</span>}
                              <span className={`build-loadout-resistance build-loadout-stat--${entry.tone}`}>
                                {entry.value}
                              </span>
                            </React.Fragment>
                          ))}
                        </span>
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="build-loadout-toolbar">
            <div className="build-loadout-control-strip">
              {loadouts.length > 0 && (
                <select
                  aria-label="Build Loadout"
                  className="panel-select build-loadout-select"
                  value={selectedLoadout?.key ?? "__custom"}
                  onChange={(event) => {
                    const nextSelection = applyBuildLoadout(payload, event.target.value);
                    if (nextSelection) {
                      setSelection(nextSelection);
                    }
                  }}
                >
                  {!selectedLoadout && <option value="__custom">Custom</option>}
                  {loadouts.map((loadout) => (
                    <option key={loadout.key} value={loadout.key}>
                      {loadout.label}
                    </option>
                  ))}
                </select>
              )}
              <CompareBuildModal payload={payload} selection={selection} />
              <button className="btn btn-secondary build-share-button" type="button" onClick={() => void handleShareBuild()}>
                Share this PoB
              </button>
              <button
                className="btn btn-secondary build-share-button"
                type="button"
                onClick={() => void handleCopyFullPobCode()}
              >
                Copy Full PoB Code
              </button>
              {hasWeaponSwapContent && (
                <button
                  aria-label="Show Weapon Swap"
                  aria-pressed={showWeaponSwap}
                  className={`btn btn-secondary build-loadout-toggle${showWeaponSwap ? " build-loadout-toggle--active" : ""}`}
                  type="button"
                  onClick={() => setShowWeaponSwap((current) => !current)}
                >
                  Show Weapon Swap
                </button>
              )}
            </div>
          </div>
        </section>

        <div className="build-layout-top">
          <div className="build-layout-top-main">
            <ItemsPanel
              payload={payload}
              itemSetId={selection.itemSetId}
              showWeaponSwap={showWeaponSwap}
              treeIndex={selection.treeIndex}
              onItemSetChange={(itemSetId) => {
                setSelection((current) => ({ ...current, itemSetId }));
              }}
            />
          </div>
          {useMobileStatsPlacement && (
            <div className="build-layout-mobile-stats">
              <StatsPanel payload={payload} />
            </div>
          )}
          <div className="build-layout-top-side">
            <SkillsPanel
              payload={payload}
              showWeaponSwap={showWeaponSwap}
              skillSetId={selection.skillSetId}
              onSkillSetChange={(skillSetId) => {
                setSelection((current) => ({ ...current, skillSetId }));
              }}
            />
          </div>
        </div>
        <div style={{ marginTop: 16 }}>
          <ConfigsPanel
            payload={payload}
            configSetId={selection.configSetId}
            onConfigSetChange={(configSetId) => {
              setSelection((current) => ({ ...current, configSetId }));
            }}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <PassiveTreePanel
            payload={payload}
            treeIndex={selection.treeIndex}
            onTreeIndexChange={(treeIndex) => {
              setSelection((current) => ({ ...current, treeIndex }));
            }}
          />
        </div>
        <div style={{ marginTop: 16 }}>
          <NotesPanel payload={payload} />
        </div>
      </div>
    </div>
  );
}

function getBuildShareUrl(payload: BuildPayload): string | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }

  const id = payload.meta.id?.trim();
  if (id) {
    return new URL(`/b/${encodeURIComponent(id)}`, window.location.origin).toString();
  }

  return window.location.href;
}

function getBuildRawUrl(payload: BuildPayload): string | undefined {
  const id = payload.meta.id?.trim();
  if (!id) {
    return undefined;
  }

  return buildApiUrl(`/${encodeURIComponent(id)}/raw`);
}
