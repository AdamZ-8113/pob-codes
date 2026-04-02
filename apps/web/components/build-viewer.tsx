"use client";

import React, { useEffect, useMemo, useState } from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import { formatDisplayValue } from "../lib/format-value";
import { GEM_DETAILS } from "../lib/generated/gem-details";
import {
  applyBuildLoadout,
  findMatchingBuildLoadout,
  getBuildLoadouts,
  getInitialBuildViewerSelection,
  getSelectedSkillSet,
  type BuildViewerSelection,
} from "../lib/build-viewer-selection";
import { buildApiUrl } from "../lib/api-base";
import { getSecondaryAscendancyName } from "../lib/ascendancy-names";
import { isWeaponSwapSlot } from "../lib/weapon-swap";
import { CompareBuildModal } from "./compare-build-modal";
import { ConfigsPanel } from "./configs-panel";
import { ItemsPanel } from "./items-panel";
import { NotesPanel } from "./notes-panel";
import { PassiveTreePanel } from "./passive-tree-panel";
import { SkillsPanel } from "./skills-panel";
import { StatsPanel } from "./stats-panel";

const wholeNumberFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

type BuildSummaryTone =
  | "life"
  | "energy-shield"
  | "mana"
  | "ehp"
  | "fire"
  | "cold"
  | "lightning"
  | "chaos"
  | "dps";

interface BuildSummaryEntry {
  annotation?: string;
  key: string;
  label: string;
  tone: BuildSummaryTone;
  value: string;
}

interface BuildSummaryModel {
  metrics: BuildSummaryEntry[];
  resistances: BuildSummaryEntry[];
}

export function BuildViewer({ payload }: { payload: BuildPayload }) {
  const [selection, setSelection] = useState<BuildViewerSelection>(() => getInitialBuildViewerSelection(payload));
  const [showWeaponSwap, setShowWeaponSwap] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<{ message: string; nonce: number } | null>(null);
  const loadouts = useMemo(() => getBuildLoadouts(payload), [payload]);
  const selectedLoadout = useMemo(() => findMatchingBuildLoadout(payload, selection), [payload, selection]);
  const activeTree = payload.treeSpecs[selection.treeIndex] ?? payload.treeSpecs[payload.activeTreeIndex];
  const bloodlineAscendancyName = getSecondaryAscendancyName(activeTree?.secondaryAscendancyId);
  const loadoutTitle = useMemo(
    () => buildLoadoutTitle(payload, selection.skillSetId, bloodlineAscendancyName),
    [payload, selection.skillSetId, bloodlineAscendancyName],
  );
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
      <div className="build-layout-sidebar">
        <StatsPanel payload={payload} />
      </div>
      <div className="build-layout-main">
        <section className="panel build-loadout-panel">
          <div className="build-loadout-summary">
            <div className="build-loadout-title">
              {loadoutTitle}
              {payload.build.level ? <span className="meta"> (Level {payload.build.level})</span> : null}
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

export function buildLoadoutTitle(
  payload: BuildPayload,
  skillSetId?: number,
  secondaryAscendancyName?: string,
): string {
  const parts = [
    getPrimarySkillTitle(payload, skillSetId),
    formatClassTitle(payload.build.className, payload.build.ascendClassName),
    secondaryAscendancyName?.trim(),
  ].filter((value): value is string => Boolean(value));

  return parts.join(" / ");
}

function buildBuildSummaryEntries(payload: BuildPayload, skillSetId?: number): BuildSummaryModel {
  const stats = payload.stats.player;
  const metrics: BuildSummaryEntry[] = [];
  const resistances: BuildSummaryEntry[] = [];
  const guardSkillAnnotation = getGuardSkillAnnotation(payload, skillSetId);

  addBuildSummaryEntry(metrics, "Life", "Life", "life", stats.Life);
  addBuildSummaryEntry(metrics, "EnergyShield", "ES", "energy-shield", stats.EnergyShield);
  addBuildSummaryEntry(metrics, "Mana", "Mana", "mana", stats.Mana);
  addBuildSummaryEntry(metrics, "TotalEHP", "eHP", "ehp", stats.TotalEHP, "", guardSkillAnnotation);
  const dpsSummary = getBuildSummaryDps(stats);
  if (dpsSummary) {
    addBuildSummaryEntry(metrics, "summary-dps", dpsSummary.label, "dps", dpsSummary.value);
  }

  addBuildSummaryEntry(resistances, "FireResist", "Fire", "fire", stats.FireResist, "%");
  addBuildSummaryEntry(resistances, "ColdResist", "Cold", "cold", stats.ColdResist, "%");
  addBuildSummaryEntry(resistances, "LightningResist", "Light", "lightning", stats.LightningResist, "%");
  addBuildSummaryEntry(resistances, "ChaosResist", "Chaos", "chaos", stats.ChaosResist, "%");

  return {
    metrics,
    resistances,
  };
}

function getPrimarySkillTitle(payload: BuildPayload, skillSetId?: number): string | undefined {
  const skillSet = getSelectedSkillSet(payload, skillSetId);
  if (!skillSet) {
    return undefined;
  }

  const groupIndex = Math.max((payload.build?.mainSocketGroup ?? 1) - 1, 0);
  const candidateGroups = dedupeGroups([
    skillSet.groups[groupIndex],
    ...skillSet.groups.filter((group) => group.enabled && group.gems.some((gem) => gem.enabled && gem.selected && !gem.support)),
    ...skillSet.groups.filter((group) => group.enabled && group.gems.some((gem) => gem.enabled && !gem.support)),
    ...skillSet.groups,
  ]);

  for (const group of candidateGroups) {
    const indexedGem = group.gems[Math.max(group.mainActiveSkill - 1, 0)];
    const selectedGem =
      group.gems.find((gem) => gem.enabled && gem.selected && !gem.support) ??
      (indexedGem?.enabled && !indexedGem.support ? indexedGem : undefined) ??
      group.gems.find((gem) => gem.enabled && !gem.support);

    const normalizedName = selectedGem?.nameSpec?.trim();
    if (normalizedName) {
      return normalizedName;
    }
  }

  return undefined;
}

function dedupeGroups(groups: Array<BuildPayload["skillSets"][number]["groups"][number] | undefined>) {
  const seen = new Set<string>();
  const deduped: BuildPayload["skillSets"][number]["groups"][number][] = [];

  for (const group of groups) {
    if (!group || seen.has(group.id)) {
      continue;
    }

    seen.add(group.id);
    deduped.push(group);
  }

  return deduped;
}

function formatClassTitle(className?: string, ascendClassName?: string): string | undefined {
  const normalizedClassName = className?.trim();
  const normalizedAscendancyName = ascendClassName?.trim();

  if (normalizedAscendancyName && normalizedClassName && normalizedAscendancyName !== normalizedClassName) {
    return `${normalizedAscendancyName} (${normalizedClassName})`;
  }

  return normalizedAscendancyName || normalizedClassName;
}

function addBuildSummaryEntry(
  entries: BuildSummaryEntry[],
  key: string,
  label: string,
  tone: BuildSummaryTone,
  rawValue: string | undefined,
  suffix = "",
  annotation?: string,
) {
  if (!rawValue) {
    return;
  }

  entries.push({
    key,
    label,
    tone,
    annotation,
    value: `${formatBuildSummaryValue(rawValue)}${suffix}`,
  });
}


function getGuardSkillAnnotation(payload: BuildPayload, skillSetId?: number): string | undefined {
  const skillSets = payload.skillSets ?? [];
  const skillSet =
    skillSets.find((set) => set.id === skillSetId) ??
    skillSets.find((set) => set.active) ??
    skillSets[0];
  if (!skillSet) {
    return undefined;
  }

  let hasGuardSkill = false;
  let hasEnabledGuardSkill = false;

  for (const group of skillSet.groups) {
    for (const gem of group.gems) {
      if (gem.support || !isGuardSkillGem(gem)) {
        continue;
      }

      hasGuardSkill = true;
      if (group.enabled && gem.enabled) {
        hasEnabledGuardSkill = true;
      }
    }
  }

  if (!hasGuardSkill) {
    return undefined;
  }

  return hasEnabledGuardSkill ? "Guard Skill ON" : "Guard Skill OFF";
}

function isGuardSkillGem(gem: BuildPayload["skillSets"][number]["groups"][number]["gems"][number]) {
  if (gem.gemId) {
    const details = GEM_DETAILS[gem.gemId];
    if (details) {
      return !details.support && details.skillTypes.includes("Guard");
    }
  }

  return GUARD_SKILL_NAMES.has(normalizeGemName(gem.nameSpec));
}

function normalizeGemName(value: string) {
  return value.trim().toLowerCase();
}

const GUARD_SKILL_NAMES = new Set(
  Object.values(GEM_DETAILS)
    .filter((details) => !details.support && details.skillTypes.includes("Guard"))
    .map((details) => normalizeGemName(details.name)),
);

function getBuildSummaryDps(stats: Record<string, string>) {
  const fullDps = getUsableSummaryStat(stats.FullDPS);
  if (fullDps) {
    return {
      label: "Full DPS",
      value: fullDps,
    };
  }

  const combinedDps = getUsableSummaryStat(stats.CombinedDPS);
  if (combinedDps) {
    return {
      label: "Combined DPS",
      value: combinedDps,
    };
  }

  const hitDps = getUsableSummaryStat(stats.TotalDPS);
  if (hitDps) {
    return {
      label: "Hit DPS",
      value: hitDps,
    };
  }

  return undefined;
}

function getUsableSummaryStat(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const numericValue = Number(trimmed.replace(/,/g, ""));
  if (Number.isFinite(numericValue) && numericValue === 0) {
    return undefined;
  }

  return trimmed;
}

function formatBuildSummaryValue(value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return formatDisplayValue(value);
  }

  const raw = typeof value === "number" ? String(value) : String(value).trim();
  const numeric = Number(raw.replace(/,/g, ""));
  if (!Number.isFinite(numeric)) {
    return formatDisplayValue(value);
  }

  return wholeNumberFormatter.format(numeric);
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

async function copyTextToClipboard(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();
  const copied = document.execCommand("copy");
  document.body.removeChild(textarea);

  if (!copied) {
    throw new Error("Clipboard copy failed");
  }
}
