"use client";

import React, { useEffect, useMemo, useState } from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import {
  applyBuildLoadout,
  findMatchingBuildLoadout,
  getSelectedConfigSet,
  getBuildLoadouts,
  getInitialBuildViewerSelection,
  type BuildViewerSelection,
} from "../lib/build-viewer-selection";
import { buildApiUrl } from "../lib/api-base";
import { getSecondaryAscendancyName } from "../lib/ascendancy-names";
import {
  buildBuildSummaryEntries,
  type BuildSummaryEntry,
  buildLoadoutTitle,
  buildRecentBuildSnapshot,
  resolveBuildPatchVersion,
} from "../lib/build-overview";
import { POB_CONFIG_OPTIONS } from "../lib/generated/pob-config-options";
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

const ENEMY_BOSS_OPTION = POB_CONFIG_OPTIONS.find((option) => option.key === "enemyIsBoss");
const ENEMY_BOSS_LABELS: Record<string, string> = {
  Boss: "Standard Boss",
  None: "No Boss",
  Pinnacle: "Pinnacle Boss",
  Uber: "Uber Boss",
};

function findSummaryMetric(entries: BuildSummaryEntry[], tone: BuildSummaryEntry["tone"]) {
  return entries.find((entry) => entry.tone === tone);
}

function resolveEnemyBossLabel(configInputs: Record<string, unknown> | undefined): string | undefined {
  if (!ENEMY_BOSS_OPTION?.choices?.length) {
    return undefined;
  }

  const selectedValue = configInputs?.enemyIsBoss ?? ENEMY_BOSS_OPTION.defaultValue;
  return selectedValue !== undefined ? (ENEMY_BOSS_LABELS[String(selectedValue)] ?? String(selectedValue)) : undefined;
}

function formatGuardAnnotation(annotation: string | undefined): string | undefined {
  if (annotation === "Guard Skill ON") {
    return "w/Guard";
  }

  if (annotation === "Guard Skill OFF") {
    return "w/o Guard";
  }

  return annotation;
}

export function BuildViewer({ payload }: { payload: BuildPayload }) {
  const [selection, setSelection] = useState<BuildViewerSelection>(() => getInitialBuildViewerSelection(payload));
  const [showWeaponSwap, setShowWeaponSwap] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ message: string; nonce: number } | null>(null);
  const [useMobileStatsPlacement, setUseMobileStatsPlacement] = useState(false);
  const recentBuildId = payload.meta.id?.trim();
  const loadouts = useMemo(() => getBuildLoadouts(payload), [payload]);
  const selectedLoadout = useMemo(() => findMatchingBuildLoadout(payload, selection), [payload, selection]);
  const activeConfigSet = useMemo(() => getSelectedConfigSet(payload, selection.configSetId), [payload, selection.configSetId]);
  const activeTree = payload.treeSpecs[selection.treeIndex] ?? payload.treeSpecs[payload.activeTreeIndex];
  const bloodlineAscendancyName = getSecondaryAscendancyName(activeTree?.secondaryAscendancyId);
  const recentBuildSnapshot = useMemo(() => buildRecentBuildSnapshot(payload), [payload]);
  const loadoutTitle = useMemo(
    () => buildLoadoutTitle(payload, selection.skillSetId, bloodlineAscendancyName),
    [payload, selection.skillSetId, bloodlineAscendancyName],
  );
  const loadoutPatchVersion = useMemo(() => resolveBuildPatchVersion(payload, selection.treeIndex), [payload, selection.treeIndex]);
  const summary = useMemo(() => buildBuildSummaryEntries(payload, selection.skillSetId), [payload, selection.skillSetId]);
  const summaryLifeMetric = useMemo(() => findSummaryMetric(summary.metrics, "life"), [summary.metrics]);
  const summaryEnergyShieldMetric = useMemo(() => findSummaryMetric(summary.metrics, "energy-shield"), [summary.metrics]);
  const summaryManaMetric = useMemo(() => findSummaryMetric(summary.metrics, "mana"), [summary.metrics]);
  const summaryEhpMetric = useMemo(() => findSummaryMetric(summary.metrics, "ehp"), [summary.metrics]);
  const summaryDpsMetric = useMemo(() => findSummaryMetric(summary.metrics, "dps"), [summary.metrics]);
  const enemyBossLabel = useMemo(
    () => resolveEnemyBossLabel(activeConfigSet?.inputs ?? payload.config),
    [activeConfigSet?.inputs, payload.config],
  );
  const guardAnnotation = useMemo(() => formatGuardAnnotation(summaryEhpMetric?.annotation), [summaryEhpMetric?.annotation]);
  const summaryParts = useMemo(
    () =>
      buildLoadoutSummaryParts({
        dpsMetric: summaryDpsMetric,
        ehpMetric: summaryEhpMetric,
        energyShieldMetric: summaryEnergyShieldMetric,
        guardAnnotation,
        lifeMetric: summaryLifeMetric,
        manaMetric: summaryManaMetric,
        resistances: summary.resistances,
      }),
    [
      guardAnnotation,
      summary.resistances,
      summaryDpsMetric,
      summaryEhpMetric,
      summaryEnergyShieldMetric,
      summaryLifeMetric,
      summaryManaMetric,
    ],
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
      energyShield: recentBuildSnapshot.energyShield,
      guardAnnotation: recentBuildSnapshot.guardAnnotation,
      id: recentBuildId,
      level: recentBuildSnapshot.level,
      life: recentBuildSnapshot.life,
      mana: recentBuildSnapshot.mana,
      patchVersion: recentBuildSnapshot.patchVersion,
      resistances: recentBuildSnapshot.resistances,
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
                {enemyBossLabel ? <span className="meta"> ({enemyBossLabel})</span> : null}
              </div>
              {loadoutPatchVersion ? <div className="build-loadout-version">{loadoutPatchVersion}</div> : null}
            </div>
            {summaryParts.length > 0 && (
              <div className="build-loadout-stats">
                <div className="build-loadout-stats-line recent-build-inline recent-build-summary-row">
                  {summaryParts.map((part, index) => (
                    <React.Fragment key={part.key}>
                      {index > 0 && <span className="recent-build-divider">|</span>}
                      {renderBuildLoadoutSummaryPart(part)}
                    </React.Fragment>
                  ))}
                </div>
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
                Copy Link
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

type BuildLoadoutSummaryPart =
  | {
      annotation?: string;
      key: string;
      kind: "metric";
      label: string;
      tone: "life" | "energy-shield" | "mana" | "ehp" | "dps";
      value: string;
    }
  | {
      key: string;
      kind: "resistances";
      values: Array<{
        key: string;
        tone: "fire" | "cold" | "lightning" | "chaos";
        value: string;
      }>;
    };

function buildLoadoutSummaryParts({
  dpsMetric,
  ehpMetric,
  energyShieldMetric,
  guardAnnotation,
  lifeMetric,
  manaMetric,
  resistances,
}: {
  dpsMetric?: BuildSummaryEntry;
  ehpMetric?: BuildSummaryEntry;
  energyShieldMetric?: BuildSummaryEntry;
  guardAnnotation?: string;
  lifeMetric?: BuildSummaryEntry;
  manaMetric?: BuildSummaryEntry;
  resistances: BuildSummaryEntry[];
}) {
  const parts: BuildLoadoutSummaryPart[] = [];

  if (lifeMetric) {
    parts.push({
      key: "life",
      kind: "metric",
      label: "Life:",
      tone: "life",
      value: lifeMetric.value,
    });
  }

  if (energyShieldMetric) {
    parts.push({
      key: "energy-shield",
      kind: "metric",
      label: "ES:",
      tone: "energy-shield",
      value: energyShieldMetric.value,
    });
  }

  if (manaMetric) {
    parts.push({
      key: "mana",
      kind: "metric",
      label: "Mana:",
      tone: "mana",
      value: manaMetric.value,
    });
  }

  if (ehpMetric) {
    parts.push({
      annotation: guardAnnotation ? `(${guardAnnotation})` : undefined,
      key: "ehp",
      kind: "metric",
      label: "eHP:",
      tone: "ehp",
      value: ehpMetric.value,
    });
  }

  if (dpsMetric) {
    parts.push({
      key: "dps",
      kind: "metric",
      label: "DPS:",
      tone: "dps",
      value: dpsMetric.value,
    });
  }

  if (resistances.length > 0) {
    const tones: Array<"fire" | "cold" | "lightning" | "chaos"> = ["fire", "cold", "lightning", "chaos"];
    parts.push({
      key: "resistances",
      kind: "resistances",
      values: resistances.map((entry, index) => ({
        key: entry.key,
        tone: tones[index] ?? "chaos",
        value: entry.value,
      })),
    });
  }

  return parts;
}

function renderBuildLoadoutSummaryPart(part: BuildLoadoutSummaryPart) {
  if (part.kind === "resistances") {
    return (
      <span className="build-loadout-stat recent-build-summary-stat recent-build-summary-stat--resistances">
        <span className="build-loadout-stat-label">Res:</span>
        <span className="build-loadout-resistances">
          {part.values.map((entry, index) => (
            <React.Fragment key={entry.key}>
              {index > 0 ? <span className="build-loadout-resistance-separator">/</span> : null}
              <span className={`build-loadout-resistance build-loadout-stat--${entry.tone}`}>{entry.value}</span>
            </React.Fragment>
          ))}
        </span>
      </span>
    );
  }

  return (
    <span className={`build-loadout-stat recent-build-summary-stat build-loadout-stat--${part.tone}`}>
      <span className="build-loadout-stat-label">{part.label}</span>
      <span className="build-loadout-stat-value">{part.value}</span>
      {part.annotation ? <span className="build-loadout-stat-annotation">{part.annotation}</span> : null}
    </span>
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
