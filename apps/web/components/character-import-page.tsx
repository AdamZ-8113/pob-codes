"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";

import { buildApiUrl } from "../lib/api-base";
import { BrowserPobClient, type BrowserPobWorkerMessage } from "../lib/browser-pob/client";
import { copyTextToClipboard } from "../lib/clipboard";

type StepId = "account" | "league" | "character" | "preset" | "configure" | "review";
type PoeRealmId = "PC" | "XBOX" | "SONY";

interface PoeCharacterSummary {
  name?: string;
  league?: string;
  class?: string;
  level?: number;
}

interface ProfileCharactersResponse {
  accountName: string;
  characters: PoeCharacterSummary[];
  realm: {
    id: string;
    label: string;
    realmCode: string;
  };
}

type PrimitiveValue = boolean | number | string;
type ValueState =
  | { kind: "unset" }
  | { kind: "boolean"; value: boolean }
  | { kind: "number"; value: number }
  | { kind: "string"; value: string };

interface ConfigChoice {
  label: string;
  value: PrimitiveValue;
}

interface ConfigEntry {
  key: string;
  label: string;
  rawLabel?: string;
  type?: "check" | "list" | "number" | "text";
  rawType?: string;
  currentValue: ValueState;
  defaultValue: ValueState;
  placeholderValue: ValueState;
  choices?: ConfigChoice[];
  shown?: boolean;
}

interface ConfigBundle {
  activeConfigSetId?: number | null;
  sections: Array<{
    key: string;
    title: string;
    controls: ConfigEntry[];
  }>;
  entries: Record<string, ConfigEntry>;
}

interface LoadedPreset {
  source: string;
  resolvedUrl?: string;
  explicitInputCount: number;
  inputs: Record<string, PrimitiveValue>;
}

interface ActiveSkillOption {
  index: number;
  label: string;
  selected?: boolean;
  partCount?: number;
  isMine?: boolean;
  isMinion?: boolean;
  isMultiStage?: boolean;
  skillPartCalcs?: number | null;
  skillStageCountCalcs?: number | null;
}

interface SkillGem {
  index: number;
  label: string;
  enabled?: boolean;
  type?: string;
  isSupport?: boolean;
}

interface SkillSocketGroup {
  index: number;
  label: string;
  rawLabel?: string;
  slot?: string;
  enabled?: boolean;
  includeInFullDPS?: boolean;
  slotEnabled?: boolean;
  activeSkillIndex?: number;
  activeSkills?: ActiveSkillOption[];
  gems?: SkillGem[];
}

interface SkillsBundle {
  primarySocketGroupIndex?: number | null;
  socketGroups: SkillSocketGroup[];
}

interface SkillGemState {
  enabled: boolean;
}

interface SkillGroupState {
  enabled: boolean;
  includeInFullDPS: boolean;
  activeSkillIndex: number;
  gems: Record<number, SkillGemState>;
}

interface SkillState {
  primarySocketGroupIndex: number;
  socketGroups: Record<number, SkillGroupState>;
}

interface WorkerRunResult {
  mode?: string;
  label?: string;
  loadBuildMs?: number;
  recalcMs?: number;
  profileMeta?: {
    accountName?: string;
    characterName?: string;
    profileFetchMs?: number;
  };
  requirements?: {
    treeVersion?: string;
    includeTimeless?: boolean;
  };
  summary?: Record<string, number | string | null | undefined>;
  configBundle?: ConfigBundle;
  skillsBundle?: SkillsBundle;
}

type WizardSummaryPart =
  | {
      key: string;
      kind: "text";
      label: string;
      value: string;
      tone?: "life" | "energy-shield" | "mana" | "dps";
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

function cloneValueState(valueState: ValueState | undefined): ValueState {
  if (!valueState || valueState.kind === "unset") {
    return { kind: "unset" };
  }

  return {
    kind: valueState.kind,
    value: valueState.value,
  } as ValueState;
}

function valueStateFromPrimitive(value: PrimitiveValue | undefined): ValueState {
  if (typeof value === "boolean") {
    return { kind: "boolean", value };
  }
  if (typeof value === "number" && Number.isFinite(value)) {
    return { kind: "number", value };
  }
  if (typeof value === "string") {
    return { kind: "string", value };
  }
  return { kind: "unset" };
}

function isSameValueState(left: ValueState | undefined, right: ValueState | undefined) {
  const normalizedLeft = cloneValueState(left);
  const normalizedRight = cloneValueState(right);

  if (normalizedLeft.kind !== normalizedRight.kind) {
    return false;
  }
  if (normalizedLeft.kind === "unset") {
    return true;
  }

  return normalizedLeft.value === (normalizedRight as Exclude<ValueState, { kind: "unset" }>).value;
}

function cloneEntryMap(entryMap: Record<string, ValueState>) {
  const out: Record<string, ValueState> = {};
  for (const [key, value] of Object.entries(entryMap)) {
    out[key] = cloneValueState(value);
  }
  return out;
}

function createAppliedEntriesFromBundle(bundle: ConfigBundle | null) {
  const out: Record<string, ValueState> = {};
  for (const [key, entry] of Object.entries(bundle?.entries ?? {})) {
    out[key] = cloneValueState(entry.currentValue);
  }
  return out;
}

function mergePresetIntoDraftEntries(
  draftEntries: Record<string, ValueState>,
  presetInputs: Record<string, PrimitiveValue>,
) {
  const nextDraftEntries = cloneEntryMap(draftEntries);
  for (const [key, value] of Object.entries(presetInputs)) {
    nextDraftEntries[key] = valueStateFromPrimitive(value);
  }
  return nextDraftEntries;
}

function serializeDraftEntries(draftEntries: Record<string, ValueState>) {
  return Object.entries(draftEntries)
    .map(([key, valueState]) => ({
      key,
      kind: valueState.kind,
      ...(valueState.kind === "unset" ? {} : { value: valueState.value }),
    }))
    .sort((left, right) => left.key.localeCompare(right.key));
}

function buildPresetFromDraft(
  draftEntries: Record<string, ValueState>,
  configBundle: ConfigBundle | null,
) {
  const out: Record<string, PrimitiveValue> = {};
  for (const [key, draftValue] of Object.entries(draftEntries)) {
    const defaultValue = configBundle?.entries?.[key]?.defaultValue ?? { kind: "unset" as const };
    if (draftValue.kind === "unset" || isSameValueState(draftValue, defaultValue)) {
      continue;
    }
    out[key] = draftValue.value as PrimitiveValue;
  }
  return out;
}

function hasConfigDraftChanges(
  appliedEntries: Record<string, ValueState>,
  draftEntries: Record<string, ValueState>,
) {
  const allKeys = new Set([...Object.keys(appliedEntries), ...Object.keys(draftEntries)]);

  for (const key of allKeys) {
    if (!isSameValueState(appliedEntries[key], draftEntries[key])) {
      return true;
    }
  }

  return false;
}

function cloneSkillGroupState(
  groupState: Partial<SkillGroupState> | undefined,
  fallbackActiveSkillIndex = 1,
): SkillGroupState {
  const gems: Record<number, SkillGemState> = {};
  for (const [gemIndex, gemState] of Object.entries(groupState?.gems ?? {})) {
    gems[Number(gemIndex)] = {
      enabled: gemState?.enabled !== false,
    };
  }

  return {
    enabled: groupState?.enabled !== false,
    includeInFullDPS: Boolean(groupState?.includeInFullDPS),
    activeSkillIndex: Number(groupState?.activeSkillIndex ?? fallbackActiveSkillIndex),
    gems,
  };
}

function createDefaultSkillGroupState(
  group: SkillSocketGroup,
  sourceGroup?: SkillGroupState | null,
): SkillGroupState {
  const fallbackActiveSkillIndex = Number(
    group.activeSkillIndex ??
      group.activeSkills?.find((entry) => entry.selected)?.index ??
      group.activeSkills?.[0]?.index ??
      1,
  );
  const nextState = cloneSkillGroupState(sourceGroup ?? undefined, fallbackActiveSkillIndex);
  nextState.enabled = sourceGroup?.enabled ?? (group.enabled !== false);
  nextState.includeInFullDPS = sourceGroup?.includeInFullDPS ?? Boolean(group.includeInFullDPS);
  nextState.activeSkillIndex = Number(sourceGroup?.activeSkillIndex ?? fallbackActiveSkillIndex);

  for (const gem of group.gems ?? []) {
    nextState.gems[Number(gem.index)] = {
      enabled: sourceGroup?.gems?.[Number(gem.index)]?.enabled ?? (gem.enabled !== false),
    };
  }

  return nextState;
}

function cloneSkillState(skillState: SkillState | null | undefined): SkillState {
  if (!skillState || typeof skillState !== "object") {
    return {
      primarySocketGroupIndex: 1,
      socketGroups: {},
    };
  }

  const socketGroups: Record<number, SkillGroupState> = {};
  for (const [groupIndex, groupState] of Object.entries(skillState.socketGroups ?? {})) {
    socketGroups[Number(groupIndex)] = cloneSkillGroupState(groupState);
  }

  return {
    primarySocketGroupIndex: Number(skillState.primarySocketGroupIndex ?? 1),
    socketGroups,
  };
}

function createAppliedSkillStateFromBundle(bundle: SkillsBundle | null | undefined): SkillState {
  const nextState: SkillState = {
    primarySocketGroupIndex: Number(bundle?.primarySocketGroupIndex ?? 1),
    socketGroups: {},
  };

  for (const group of bundle?.socketGroups ?? []) {
    nextState.socketGroups[Number(group.index)] = createDefaultSkillGroupState(group);
  }

  return nextState;
}

function getCurrentSkillGroups(bundle: SkillsBundle | null | undefined) {
  return Array.isArray(bundle?.socketGroups) ? bundle.socketGroups : [];
}

function getDisplayedSkillGroups(bundle: SkillsBundle | null | undefined) {
  const visible = getCurrentSkillGroups(bundle).filter((group) => group.slotEnabled !== false);
  return visible.length > 0 ? visible : getCurrentSkillGroups(bundle);
}

function getSkillGroupBundle(bundle: SkillsBundle | null | undefined, groupIndex: number) {
  return getCurrentSkillGroups(bundle).find((group) => Number(group.index) === Number(groupIndex)) ?? null;
}

function ensureVisiblePrimarySkillState(
  bundle: SkillsBundle | null | undefined,
  skillState: SkillState | null | undefined,
): SkillState {
  const nextState = cloneSkillState(skillState);
  const displayedGroups = getDisplayedSkillGroups(bundle);
  if (displayedGroups.length === 0) {
    return nextState;
  }

  const currentPrimaryGroupIndex = Number(nextState.primarySocketGroupIndex ?? 1);
  if (displayedGroups.some((group) => Number(group.index) === currentPrimaryGroupIndex)) {
    return nextState;
  }

  const nextPrimaryGroup = displayedGroups[0];
  const nextPrimaryGroupState = createDefaultSkillGroupState(
    nextPrimaryGroup,
    nextState.socketGroups[Number(nextPrimaryGroup.index)],
  );

  nextState.primarySocketGroupIndex = Number(nextPrimaryGroup.index);
  nextState.socketGroups[Number(nextPrimaryGroup.index)] = nextPrimaryGroupState;
  return nextState;
}

function hasSkillDraftChanges(appliedSkillState: SkillState | null, draftSkillState: SkillState | null) {
  const applied = appliedSkillState ?? { primarySocketGroupIndex: 1, socketGroups: {} };
  const draft = draftSkillState ?? applied;

  if (Number(applied.primarySocketGroupIndex ?? 1) !== Number(draft.primarySocketGroupIndex ?? 1)) {
    return true;
  }

  const groupKeys = new Set([
    ...Object.keys(applied.socketGroups ?? {}),
    ...Object.keys(draft.socketGroups ?? {}),
  ]);

  for (const groupKey of groupKeys) {
    const normalizedGroupKey = Number(groupKey);
    const appliedGroup = applied.socketGroups?.[normalizedGroupKey] ?? {
      enabled: true,
      includeInFullDPS: false,
      activeSkillIndex: 1,
      gems: {},
    };
    const draftGroup = draft.socketGroups?.[normalizedGroupKey] ?? appliedGroup;
    if (Boolean(appliedGroup.enabled) !== Boolean(draftGroup.enabled)) {
      return true;
    }
    if (Boolean(appliedGroup.includeInFullDPS) !== Boolean(draftGroup.includeInFullDPS)) {
      return true;
    }
    if (Number(appliedGroup.activeSkillIndex ?? 1) !== Number(draftGroup.activeSkillIndex ?? 1)) {
      return true;
    }

    const gemKeys = new Set([
      ...Object.keys(appliedGroup.gems ?? {}),
      ...Object.keys(draftGroup.gems ?? {}),
    ]);
    for (const gemKey of gemKeys) {
      const normalizedGemKey = Number(gemKey);
      const appliedGem = appliedGroup.gems?.[normalizedGemKey] ?? { enabled: true };
      const draftGem = draftGroup.gems?.[normalizedGemKey] ?? appliedGem;
      if (Boolean(appliedGem.enabled) !== Boolean(draftGem.enabled)) {
        return true;
      }
    }
  }

  return false;
}

function controlMatchesSearch(control: ConfigEntry, searchTerm: string) {
  if (!searchTerm) {
    return true;
  }

  const haystack = [
    control.label,
    control.rawLabel,
    control.key,
    ...(Array.isArray(control.choices) ? control.choices.map((choice) => choice.label) : []),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  return haystack.includes(searchTerm);
}

function getValueStateDisplay(valueState: ValueState | undefined) {
  if (!valueState || valueState.kind === "unset") {
    return "";
  }
  return String(valueState.value ?? "");
}

function formatSummaryValue(value: number | string | null | undefined) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value.toLocaleString("en-US");
  }
  if (typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return undefined;
}

function buildWizardSelectionSummaryParts({
  accountName,
  realmLabel,
  league,
  character,
}: {
  accountName?: string;
  realmLabel?: string;
  league?: string;
  character?: string;
}) {
  const parts: WizardSummaryPart[] = [];

  if (accountName) {
    parts.push({
      key: "account",
      kind: "text",
      label: "Account:",
      value: accountName,
    });
  }

  if (realmLabel) {
    parts.push({
      key: "platform",
      kind: "text",
      label: "Platform:",
      value: realmLabel,
    });
  }

  if (league) {
    parts.push({
      key: "league",
      kind: "text",
      label: "League:",
      value: league,
    });
  }

  if (character) {
    parts.push({
      key: "character",
      kind: "text",
      label: "Character:",
      value: character,
    });
  }

  return parts;
}

function buildWizardBuildSummaryParts(summary: WorkerRunResult["summary"] | null | undefined) {
  const parts: WizardSummaryPart[] = [];

  const life = formatSummaryValue(summary?.Life);
  if (life) {
    parts.push({
      key: "life",
      kind: "text",
      label: "Life:",
      value: life,
      tone: "life",
    });
  }

  const energyShield = formatSummaryValue(summary?.EnergyShield);
  if (energyShield) {
    parts.push({
      key: "energy-shield",
      kind: "text",
      label: "ES:",
      value: energyShield,
      tone: "energy-shield",
    });
  }

  const mana = formatSummaryValue(summary?.Mana);
  if (mana) {
    parts.push({
      key: "mana",
      kind: "text",
      label: "Mana:",
      value: mana,
      tone: "mana",
    });
  }

  const dps = formatSummaryValue(summary?.FullDPS);
  if (dps) {
    parts.push({
      key: "dps",
      kind: "text",
      label: "DPS:",
      value: dps,
      tone: "dps",
    });
  }

  const dotDps = formatSummaryValue(summary?.FullDotDPS);
  if (dotDps && dotDps !== "0") {
    parts.push({
      key: "dot-dps",
      kind: "text",
      label: "DoT DPS:",
      value: dotDps,
      tone: "dps",
    });
  }

  const resistanceValues = [
    { key: "fire-res", tone: "fire" as const, raw: summary?.FireResist },
    { key: "cold-res", tone: "cold" as const, raw: summary?.ColdResist },
    { key: "lightning-res", tone: "lightning" as const, raw: summary?.LightningResist },
    { key: "chaos-res", tone: "chaos" as const, raw: summary?.ChaosResist },
  ]
    .map((entry) => {
      const value = formatSummaryValue(entry.raw);
      return value ? { key: entry.key, tone: entry.tone, value: `${value}%` } : null;
    })
    .filter((entry): entry is { key: string; tone: "fire" | "cold" | "lightning" | "chaos"; value: string } => Boolean(entry));

  if (resistanceValues.length > 0) {
    parts.push({
      key: "resistances",
      kind: "resistances",
      values: resistanceValues,
    });
  }

  return parts;
}

const STEP_ORDER: StepId[] = ["account", "league", "character", "preset", "configure", "review"];
const STEP_LABELS: Record<StepId, string> = {
  account: "Account",
  league: "League",
  character: "Character",
  preset: "Guide Configs",
  configure: "Skills And Configs",
  review: "Review",
};
const POE_REALM_OPTIONS: Array<{ id: PoeRealmId; label: string; helpText: string }> = [
  { id: "PC", label: "PC", helpText: "Use for standard Path of Exile website accounts." },
  { id: "XBOX", label: "Xbox", helpText: "Use for Xbox gamertags, including names with spaces." },
  { id: "SONY", label: "PlayStation", helpText: "Use for PlayStation accounts." },
];
const SHOW_DEBUG_IMPORT_ACTIONS =
  process.env.NODE_ENV === "development" || process.env.NEXT_PUBLIC_DEBUG_UI === "true";

function getStepIndex(stepId: StepId) {
  return STEP_ORDER.indexOf(stepId);
}

export function GuidedImportPage() {
  const workerClientRef = useRef<BrowserPobClient | null>(null);
  const [currentStep, setCurrentStep] = useState<StepId>("account");
  const [furthestStep, setFurthestStep] = useState<StepId>("account");
  const [pending, setPending] = useState(false);
  const [viewerPending, setViewerPending] = useState(false);
  const [accountInput, setAccountInput] = useState("");
  const [selectedRealm, setSelectedRealm] = useState<PoeRealmId>("PC");
  const [profileResult, setProfileResult] = useState<ProfileCharactersResponse | null>(null);
  const [selectedLeague, setSelectedLeague] = useState("");
  const [selectedCharacter, setSelectedCharacter] = useState("");
  const [stepError, setStepError] = useState<string | null>(null);
  const [stepNote, setStepNote] = useState("Enter a public Path of Exile account name to begin.");
  const [workerReady, setWorkerReady] = useState(false);
  const [workerPending, setWorkerPending] = useState(false);
  const [workerStatus, setWorkerStatus] = useState<unknown>(null);
  const [workerMetrics, setWorkerMetrics] = useState<unknown>(null);
  const [workerLogs, setWorkerLogs] = useState<string[]>([]);
  const [loadedBuild, setLoadedBuild] = useState<WorkerRunResult | null>(null);
  const [currentConfigBundle, setCurrentConfigBundle] = useState<ConfigBundle | null>(null);
  const [appliedConfigEntries, setAppliedConfigEntries] = useState<Record<string, ValueState>>({});
  const [draftConfigEntries, setDraftConfigEntries] = useState<Record<string, ValueState>>({});
  const [currentSkillsBundle, setCurrentSkillsBundle] = useState<SkillsBundle | null>(null);
  const [appliedSkillState, setAppliedSkillState] = useState<SkillState | null>(null);
  const [draftSkillState, setDraftSkillState] = useState<SkillState | null>(null);
  const [configSearch, setConfigSearch] = useState("");
  const [openConfigSections, setOpenConfigSections] = useState<Record<string, boolean>>({});
  const [openSkillGroups, setOpenSkillGroups] = useState<Record<string, boolean>>({});
  const [presetInput, setPresetInput] = useState("");
  const [loadedPreset, setLoadedPreset] = useState<LoadedPreset | null>(null);
  const [presetSummary, setPresetSummary] = useState("Optional. Used to copy configs from another build. Continue without preset to set configs manually.");
  const [configureSummary, setConfigureSummary] = useState("Update calculations manually after applying any guide preset.");
  const [reviewSummary, setReviewSummary] = useState("Export the final code or open the build in a new viewer tab.");

  const availableLeagues = useMemo(() => {
    return Array.from(
      new Set(
        (profileResult?.characters ?? [])
          .map((character) => String(character.league ?? "").trim())
          .filter(Boolean),
      ),
    ).sort((left, right) => left.localeCompare(right));
  }, [profileResult]);

  const filteredCharacters = useMemo(() => {
    if (!selectedLeague) {
      return [];
    }
    return (profileResult?.characters ?? [])
      .filter((character) => String(character.league ?? "") === selectedLeague)
      .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")));
  }, [profileResult, selectedLeague]);

  const hasConfigChanges = useMemo(
    () => hasConfigDraftChanges(appliedConfigEntries, draftConfigEntries),
    [appliedConfigEntries, draftConfigEntries],
  );
  const hasSkillChanges = useMemo(
    () => hasSkillDraftChanges(appliedSkillState, draftSkillState),
    [appliedSkillState, draftSkillState],
  );
  const hasDraftChanges = hasConfigChanges || hasSkillChanges;

  const displayedSkillGroups = useMemo(
    () => getDisplayedSkillGroups(currentSkillsBundle),
    [currentSkillsBundle],
  );

  const draftPrimarySkillGroupIndex = useMemo(() => {
    const currentDraftIndex = Number(
      draftSkillState?.primarySocketGroupIndex ??
        currentSkillsBundle?.primarySocketGroupIndex ??
        displayedSkillGroups[0]?.index ??
        1,
    );

    if (displayedSkillGroups.some((group) => Number(group.index) === currentDraftIndex)) {
      return currentDraftIndex;
    }

    return Number(displayedSkillGroups[0]?.index ?? getCurrentSkillGroups(currentSkillsBundle)[0]?.index ?? 1);
  }, [currentSkillsBundle, displayedSkillGroups, draftSkillState]);

  const primarySkillGroup = useMemo(
    () => getSkillGroupBundle(currentSkillsBundle, draftPrimarySkillGroupIndex) ?? displayedSkillGroups[0] ?? null,
    [currentSkillsBundle, displayedSkillGroups, draftPrimarySkillGroupIndex],
  );

  const renderedConfigSections = useMemo(() => {
    const searchTerm = configSearch.trim().toLowerCase();
    return (currentConfigBundle?.sections ?? [])
      .map((section) => ({
        ...section,
        controls: (section.controls ?? []).filter(
          (control) => control.shown && controlMatchesSearch(control, searchTerm),
        ),
      }))
      .filter((section) => section.controls.length > 0);
  }, [configSearch, currentConfigBundle]);

  const selectionSummaryParts = useMemo(
    () =>
      buildWizardSelectionSummaryParts({
        accountName: profileResult?.accountName || accountInput.trim() || undefined,
        realmLabel: profileResult?.realm.label ?? POE_REALM_OPTIONS.find((realm) => realm.id === selectedRealm)?.label,
        league: selectedLeague || undefined,
        character: selectedCharacter || undefined,
      }),
    [accountInput, profileResult?.accountName, profileResult?.realm.label, selectedCharacter, selectedLeague, selectedRealm],
  );

  const buildSummaryParts = useMemo(
    () => buildWizardBuildSummaryParts(loadedBuild?.summary),
    [loadedBuild?.summary],
  );

  useEffect(() => {
    return () => {
      workerClientRef.current?.dispose();
      workerClientRef.current = null;
    };
  }, []);

  function canOpenStep(stepId: StepId) {
    return getStepIndex(stepId) <= getStepIndex(furthestStep);
  }

  function setCurrentAndFurthestStep(stepId: StepId) {
    setCurrentStep(stepId);
    setFurthestStep((current) => (getStepIndex(stepId) > getStepIndex(current) ? stepId : current));
  }

  function clearLoadedBuildState() {
    setLoadedBuild(null);
    setCurrentConfigBundle(null);
    setAppliedConfigEntries({});
    setDraftConfigEntries({});
    setCurrentSkillsBundle(null);
    setAppliedSkillState(null);
    setDraftSkillState(null);
    setConfigSearch("");
    setOpenConfigSections({});
    setOpenSkillGroups({});
    setLoadedPreset(null);
    setPresetInput("");
    setPresetSummary("Optional. Used to copy configs from another build. Continue without preset to set configs manually.");
    setConfigureSummary("Manually update calculations at the bottom. Some configs may not be visible unless their dependent configs are enabled and an update is run (e.g. Wither Stacks won't be available if PoB doesn't see a source of Wither, such as Unholy Might or a skill gem)");
    setReviewSummary("Export the final code or open the build in a new viewer tab.");
    setFurthestStep((current) => (getStepIndex(current) > getStepIndex("character") ? "character" : current));
  }

  function clearLoadedProfileState() {
    setProfileResult(null);
    setSelectedLeague("");
    setSelectedCharacter("");
    setCurrentStep("account");
    setFurthestStep("account");
    clearLoadedBuildState();
  }

  function handleAccountInputChange(value: string) {
    setAccountInput(value);
    setStepError(null);
    if (profileResult || selectedLeague || selectedCharacter || loadedBuild) {
      clearLoadedProfileState();
      setStepNote("Account changed. Load the public profile again.");
    }
  }

  function handleRealmChange(value: string) {
    const nextRealm = POE_REALM_OPTIONS.some((realm) => realm.id === value) ? (value as PoeRealmId) : "PC";
    setSelectedRealm(nextRealm);
    if (profileResult || selectedLeague || selectedCharacter || loadedBuild) {
      clearLoadedProfileState();
    }
    setStepError(null);
    setStepNote("Platform changed. Load the public profile again.");
  }

  function hydrateFromRunResult(result: WorkerRunResult) {
    setLoadedBuild(result);
    const nextConfigBundle = result.configBundle ?? null;
    const nextAppliedEntries = createAppliedEntriesFromBundle(nextConfigBundle);
    const nextSkillsBundle = result.skillsBundle ?? null;
    const nextAppliedSkillState = ensureVisiblePrimarySkillState(
      nextSkillsBundle,
      createAppliedSkillStateFromBundle(nextSkillsBundle),
    );
    setCurrentConfigBundle(nextConfigBundle);
    setAppliedConfigEntries(nextAppliedEntries);
    setDraftConfigEntries(cloneEntryMap(nextAppliedEntries));
    setCurrentSkillsBundle(nextSkillsBundle);
    setAppliedSkillState(nextAppliedSkillState);
    setDraftSkillState(cloneSkillState(nextAppliedSkillState));
    setOpenConfigSections(nextConfigBundle?.sections?.[0]?.key ? { [nextConfigBundle.sections[0].key]: true } : {});
    setOpenSkillGroups({});
  }

  function getDraftValueState(controlKey: string) {
    return draftConfigEntries[controlKey] ?? { kind: "unset" as const };
  }

  function updateDraftEntry(key: string, nextValueState: ValueState) {
    setDraftConfigEntries((current) => ({
      ...current,
      [key]: cloneValueState(nextValueState),
    }));
  }

  function getGroupStateForRender(group: SkillSocketGroup) {
    return (
      draftSkillState?.socketGroups?.[Number(group.index)] ??
      appliedSkillState?.socketGroups?.[Number(group.index)] ??
      createDefaultSkillGroupState(group)
    );
  }

  function updateDraftSkillState(mutator: (nextState: SkillState) => void) {
    setDraftSkillState((current) => {
      const base = ensureVisiblePrimarySkillState(
        currentSkillsBundle,
        current ?? appliedSkillState ?? createAppliedSkillStateFromBundle(currentSkillsBundle),
      );
      mutator(base);
      return ensureVisiblePrimarySkillState(currentSkillsBundle, base);
    });
  }

  function ensureNextSkillGroupState(nextState: SkillState, group: SkillSocketGroup) {
    const groupKey = Number(group.index);
    if (!nextState.socketGroups[groupKey]) {
      nextState.socketGroups[groupKey] = createDefaultSkillGroupState(
        group,
        appliedSkillState?.socketGroups?.[groupKey],
      );
    }
    return nextState.socketGroups[groupKey];
  }

  function handleWorkerMessage(message: BrowserPobWorkerMessage) {
    if (message.type === "ready") {
      setWorkerReady(true);
      return;
    }

    if (message.type === "pending") {
      setWorkerPending(message.pending);
      return;
    }

    if (message.type === "log") {
      setWorkerLogs((current) => [...current.slice(-199), message.message]);
      return;
    }

    if (message.type === "status") {
      setWorkerStatus(message.payload);
      return;
    }

    if (message.type === "metrics") {
      setWorkerMetrics(message.payload);
    }
  }

  function getWorkerClient() {
    if (!workerClientRef.current) {
      workerClientRef.current = new BrowserPobClient(handleWorkerMessage);
    }
    return workerClientRef.current;
  }

  async function handleLoadAccount() {
    const accountName = accountInput.trim();
    if (!accountName) {
      setStepError("Account name is required.");
      return;
    }

    setPending(true);
    setStepError(null);
    setStepNote(`Loading public profile for ${accountName}...`);

    try {
      const response = await fetch("/api/poe/characters", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          realm: selectedRealm,
          accountName,
        }),
      });

      const body = (await response.json().catch(() => null)) as { error?: string } & Partial<ProfileCharactersResponse> | null;
      if (!response.ok || !body?.accountName || !Array.isArray(body.characters)) {
        throw new Error(body?.error ?? "Could not load account characters.");
      }

      setProfileResult(body as ProfileCharactersResponse);
      clearLoadedBuildState();

      const leagues = Array.from(new Set(body.characters.map((character) => String(character.league ?? "").trim()).filter(Boolean))).sort(
        (left, right) => left.localeCompare(right),
      );
      const nextLeague = leagues[0] ?? "";
      const nextCharacter = body.characters
        .filter((character) => String(character.league ?? "").trim() === nextLeague)
        .sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")))[0];

      setSelectedLeague(nextLeague);
      setSelectedCharacter("");
      setCurrentStep("league");
      setFurthestStep("league");
      setStepNote(
        `${body.accountName} loaded successfully. `,
      );

      if (nextLeague && nextCharacter?.name) {
        setStepNote(`${body.accountName} loaded successfully. `);
      }
    } catch (error) {
      setProfileResult(null);
      setSelectedLeague("");
      setSelectedCharacter("");
      clearLoadedBuildState();
      setStepError(error instanceof Error ? error.message : "Could not load account characters.");
      setStepNote("Enter a public Path of Exile account name to begin.");
    } finally {
      setPending(false);
    }
  }

  function handleContinueLeague() {
    if (!selectedLeague) {
      setStepError("Choose a league first.");
      return;
    }

    setStepError(null);
    setSelectedCharacter("");
    setCurrentAndFurthestStep("character");
    setStepNote(`League selected: ${selectedLeague}.`);
  }

  function handleContinueCharacter() {
    if (!selectedCharacter) {
      setStepError("Choose a character first.");
      return;
    }

    setStepError(null);
    void handleLoadCharacterBuild();
  }

  async function handleLoadCharacterBuild() {
    if (!profileResult?.accountName || !selectedCharacter) {
      setStepError("Choose a character first.");
      return;
    }

    setStepError(null);
    setStepNote(`Loading ${selectedCharacter} in the browser worker...`);

    try {
      const client = getWorkerClient();
      const payload = await client.request<{
        accountName: string;
        characterName: string;
        realm: { id: string; label: string; realmCode: string };
        result: WorkerRunResult;
      }>("runProfileCharacterBuild", {
        realm: profileResult.realm.id,
        accountName: profileResult.accountName,
        characterName: selectedCharacter,
      });

      hydrateFromRunResult(payload.result);
      setLoadedPreset(null);
      setPresetInput("");
      setPresetSummary("Optional. Used to copy configs from another build. Continue without preset to set configs manually.");
      setCurrentAndFurthestStep("preset");
      setStepNote(`${payload.characterName} loaded successfully.`);
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Could not load the selected character.");
      setStepNote(`${selectedCharacter} is still selected. Fix the issue and retry.`);
    }
  }

  async function handleLoadPreset() {
    const source = presetInput.trim();
    if (!source) {
      setStepError("Paste a pob.codes, pobb.in, or raw PoB code preset source first.");
      return;
    }

    setPending(true);
    setStepError(null);
    setPresetSummary("Resolving build link and extracting guide config preset...");

    try {
      const response = await fetch("/api/browser-pob/config-preset", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ source }),
      });

      const body = (await response.json().catch(() => null)) as ({ error?: string } & Partial<LoadedPreset>) | null;
      if (!response.ok || !body?.inputs) {
        throw new Error(body?.error ?? "Could not resolve guide config preset.");
      }

      const preset: LoadedPreset = {
        source,
        resolvedUrl: body.resolvedUrl,
        explicitInputCount: Number(body.explicitInputCount ?? Object.keys(body.inputs ?? {}).length),
        inputs: body.inputs as Record<string, PrimitiveValue>,
      };

      setLoadedPreset(preset);
      setDraftConfigEntries((current) => mergePresetIntoDraftEntries(current, preset.inputs));

      const visibleCount = Object.keys(preset.inputs).reduce(
        (count, key) => (currentConfigBundle?.entries?.[key]?.shown ? count + 1 : count),
        0,
      );
      setPresetSummary(
        `Loaded ${preset.explicitInputCount} preset values from ${preset.resolvedUrl ?? preset.source}. ${visibleCount} are currently visible on this character.`,
      );
      setConfigureSummary("Guide preset is staged. Review configs, skills, and gems, then click Update Calculations.");
      setCurrentAndFurthestStep("configure");
      setStepNote("Guide preset loaded. Apply it manually before moving to review.");
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Could not resolve guide config preset.");
      setPresetSummary("Optional. Used to copy configs from another build. Continue without preset to set configs manually.");
    } finally {
      setPending(false);
    }
  }

  function handleSkipPreset() {
    setStepError(null);
    setCurrentAndFurthestStep("configure");
  }

  async function handleUpdateCalculations() {
    if (!loadedBuild) {
      setStepError("Load a character first.");
      return;
    }

    setStepError(null);
    setConfigureSummary("Updating calculations in the browser worker...");

    try {
      const result = await getWorkerClient().request<WorkerRunResult>("applyBuildAdjustments", {
        entries: serializeDraftEntries(draftConfigEntries),
        skillState: draftSkillState,
      });

      hydrateFromRunResult(result);
      setConfigureSummary(`Calculations updated in ${(result.recalcMs ?? 0).toFixed(2)} ms.`);
      setStepNote("Calculations updated. Continue to review when ready.");
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Could not update calculations.");
      setConfigureSummary("Update calculations manually after applying any guide preset.");
    }
  }

  function handleContinueToReview() {
    if (hasDraftChanges) {
      setStepError("Update calculations before continuing to review.");
      return;
    }

    setStepError(null);
    setCurrentAndFurthestStep("review");
  }

  async function handleCopyBuildCode() {
    try {
      const payload = await getWorkerClient().request<{ code: string; codeLength: number }>("exportBuildCode");
      await copyTextToClipboard(payload.code);
      setReviewSummary(`Copied ${payload.codeLength.toLocaleString("en-US")} characters of PoB code to the clipboard.`);
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Could not copy PoB code.");
    }
  }

  async function handleCopyConfigPreset() {
    try {
      const payload = {
        source: loadedPreset?.source ?? null,
        resolvedUrl: loadedPreset?.resolvedUrl ?? null,
        inputs: buildPresetFromDraft(draftConfigEntries, currentConfigBundle),
      };
      await copyTextToClipboard(JSON.stringify(payload, null, 2));
      setReviewSummary(`Copied ${Object.keys(payload.inputs).length} explicit config values to the clipboard.`);
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Could not copy config preset.");
    }
  }

  async function handleOpenInViewer() {
    setViewerPending(true);
    setStepError(null);

    try {
      const exportPayload = await getWorkerClient().request<{ code: string }>("exportBuildCode");
      const response = await fetch(buildApiUrl("/pob"), {
        method: "POST",
        body: exportPayload.code,
      });
      const body = (await response.json().catch(() => null)) as { error?: string; id?: string; shortUrl?: string } | null;
      if (!response.ok || !body?.id) {
        throw new Error(body?.error ?? "Could not upload build to the viewer.");
      }

      const viewerUrl = new URL(`/b/${body.id}`, window.location.origin).toString();
      window.open(viewerUrl, "_blank", "noopener,noreferrer");
      setReviewSummary("Opened the configured build in a new viewer tab.");
    } catch (error) {
      setStepError(error instanceof Error ? error.message : "Could not open the viewer.");
    } finally {
      setViewerPending(false);
    }
  }

  function renderSummaryPart(part: WizardSummaryPart) {
    if (part.kind === "resistances") {
      return (
        <span className="build-loadout-stat recent-build-summary-stat recent-build-summary-stat--resistances">
          <span className="build-loadout-stat-label">Res:</span>
          <span className="build-loadout-resistances">
            {part.values.map((entry, index) => (
              <Fragment key={entry.key}>
                {index > 0 ? <span className="build-loadout-resistance-separator">/</span> : null}
                <span className={`build-loadout-resistance build-loadout-stat--${entry.tone}`}>{entry.value}</span>
              </Fragment>
            ))}
          </span>
        </span>
      );
    }

    return (
      <span className={`build-loadout-stat recent-build-summary-stat${part.tone ? ` build-loadout-stat--${part.tone}` : ""}`}>
        <span className="build-loadout-stat-label">{part.label}</span>
        <span className="build-loadout-stat-value">{part.value}</span>
      </span>
    );
  }

  function renderSummaryStrip(parts: WizardSummaryPart[], emptyLabel = "Not selected yet.") {
    if (parts.length === 0) {
      return <div className="meta wizard-empty-state">{emptyLabel}</div>;
    }

    return (
      <div className="build-loadout-stats wizard-summary-strip">
        <div className="build-loadout-stats-line recent-build-inline recent-build-summary-row">
          {parts.map((part, index) => (
            <Fragment key={part.key}>
              {index > 0 ? <span className="recent-build-divider">|</span> : null}
              {renderSummaryPart(part)}
            </Fragment>
          ))}
        </div>
      </div>
    );
  }

  function renderConfigControl(control: ConfigEntry) {
    const draftValue = getDraftValueState(control.key);

    if (control.type === "check") {
      return (
        <label key={control.key} className="wizard-config-checkbox">
          <input
            type="checkbox"
            checked={draftValue.kind === "boolean" ? Boolean(draftValue.value) : false}
            onChange={(event) =>
              updateDraftEntry(control.key, {
                kind: "boolean",
                value: event.target.checked,
              })
            }
          />
          <span className="wizard-config-checkbox-copy">
            <span className="wizard-config-checkbox-label">{control.label}</span>
            <span className="wizard-config-checkbox-meta">{control.key}</span>
          </span>
        </label>
      );
    }

    if (control.type === "list") {
      const choices = Array.isArray(control.choices) ? control.choices : [];
      const currentValue = draftValue.kind === "unset" ? undefined : draftValue.value;
      let selectedIndex = choices.findIndex((choice) => choice.value === currentValue);
      if (selectedIndex < 0) {
        const fallbackValue = control.defaultValue?.kind === "unset" ? undefined : control.defaultValue?.value;
        selectedIndex = choices.findIndex((choice) => choice.value === fallbackValue);
      }
      if (selectedIndex < 0 && choices.length > 0) {
        selectedIndex = 0;
      }

      return (
        <label key={control.key} className="wizard-config-control">
          <span className="wizard-config-control-label">{control.label}</span>
          <select
            className="panel-select wizard-select"
            value={selectedIndex >= 0 ? String(selectedIndex) : ""}
            onChange={(event) => {
              const choice = choices[Number(event.target.value)];
              updateDraftEntry(control.key, valueStateFromPrimitive(choice?.value));
            }}
          >
            {choices.map((choice, index) => (
              <option key={`${control.key}:${choice.label}:${index}`} value={String(index)}>
                {choice.label}
              </option>
            ))}
          </select>
        </label>
      );
    }

    if (control.type === "number") {
      return (
        <label key={control.key} className="wizard-config-control">
          <span className="wizard-config-control-label">{control.label}</span>
          <input
            className="panel-input"
            type="number"
            step={control.rawType === "float" ? "any" : "1"}
            inputMode="decimal"
            value={draftValue.kind === "number" ? String(draftValue.value ?? "") : ""}
            placeholder={getValueStateDisplay(control.placeholderValue) || getValueStateDisplay(control.defaultValue)}
            onChange={(event) => {
              const nextValue = event.target.value.trim();
              if (!nextValue) {
                updateDraftEntry(control.key, { kind: "unset" });
                return;
              }

              const parsed = Number(nextValue);
              if (Number.isFinite(parsed)) {
                updateDraftEntry(control.key, { kind: "number", value: parsed });
              }
            }}
          />
        </label>
      );
    }

    const isCustomMods = control.key === "customMods";
    return (
      <label key={control.key} className="wizard-config-control">
        <span className="wizard-config-control-label">{control.label}</span>
        {isCustomMods ? (
          <textarea
            className="code-area wizard-config-textarea"
            value={draftValue.kind === "string" ? String(draftValue.value ?? "") : ""}
            placeholder={getValueStateDisplay(control.placeholderValue) || getValueStateDisplay(control.defaultValue)}
            onChange={(event) => {
              if (!event.target.value.length) {
                updateDraftEntry(control.key, { kind: "unset" });
              } else {
                updateDraftEntry(control.key, { kind: "string", value: event.target.value });
              }
            }}
          />
        ) : (
          <input
            className="panel-input"
            type="text"
            value={draftValue.kind === "string" ? String(draftValue.value ?? "") : ""}
            placeholder={getValueStateDisplay(control.placeholderValue) || getValueStateDisplay(control.defaultValue)}
            onChange={(event) => {
              if (!event.target.value.length) {
                updateDraftEntry(control.key, { kind: "unset" });
              } else {
                updateDraftEntry(control.key, { kind: "string", value: event.target.value });
              }
            }}
          />
        )}
      </label>
    );
  }

  const primarySkillGroupState = primarySkillGroup ? getGroupStateForRender(primarySkillGroup) : null;
  const primaryActiveSkills = primarySkillGroup?.activeSkills ?? [];
  const primaryActiveSkill =
    primaryActiveSkills.find(
      (skill) => Number(skill.index) === Number(primarySkillGroupState?.activeSkillIndex ?? 1),
    ) ??
    primaryActiveSkills[0] ??
    null;

  return (
    <div className="wizard-shell">
      <section className="panel wizard-hero">
        <div className="panel-toolbar wizard-hero-toolbar">
          <div>
            <div className="wizard-eyebrow">Guided Import</div>
            <h1 className="wizard-title">Import a Character</h1>
            <p className="wizard-lede">
              Public profile first, then league, then character. The full PoB runtime will stay on the user&apos;s device,
              and the finished build will open in a new viewer tab.
            </p>
          </div>
          <Link href="/" className="btn btn-secondary wizard-hero-link">
            Back To Paste Import
          </Link>
        </div>
      </section>

      <nav className="panel wizard-stepper" aria-label="Guided import steps">
        {STEP_ORDER.map((stepId, index) => {
          const isActive = stepId === currentStep;
          const isComplete = getStepIndex(stepId) < getStepIndex(currentStep);
          const disabled = !canOpenStep(stepId);

          return (
            <button
              key={stepId}
              type="button"
              className={`wizard-step${isActive ? " wizard-step--active" : ""}${isComplete ? " wizard-step--complete" : ""}`}
              onClick={() => {
                if (!disabled) {
                  setCurrentStep(stepId);
                  setStepError(null);
                }
              }}
              disabled={disabled}
              aria-current={isActive ? "step" : undefined}
            >
              <span className="wizard-step-index">{index + 1}</span>
              <span className="wizard-step-copy">
                <span className="wizard-step-label">{STEP_LABELS[stepId]}</span>
                <span className="wizard-step-state">
                  {isActive ? "Current" : isComplete ? "Done" : disabled ? "Locked" : "Ready"}
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      <section className="panel wizard-summary-strip-panel">
        {renderSummaryStrip(selectionSummaryParts)}
      </section>

      {stepError ? (
        <div className="error-box wizard-error-box">{stepError}</div>
      ) : null}

      <section className="panel wizard-stage">
        <div className="panel-toolbar">
          <h2>{STEP_LABELS[currentStep]}</h2>
          <div className="meta">{stepNote}</div>
        </div>

        {currentStep === "account" ? (
          <div className="wizard-field-grid">
            <div className="wizard-account-fields">
              <label className="wizard-field">
                <span>Path of Exile Account Name</span>
                <input
                  className="panel-input"
                  type="text"
                  value={accountInput}
                  onChange={(event) => handleAccountInputChange(event.target.value)}
                  placeholder="ExampleAccount#1234"
                  autoComplete="off"
                />
              </label>
              <label className="wizard-field">
                <span>Platform</span>
                <select
                  className="panel-select wizard-select"
                  value={selectedRealm}
                  onChange={(event) => handleRealmChange(event.target.value)}
                >
                  {POE_REALM_OPTIONS.map((realm) => (
                    <option key={realm.id} value={realm.id}>
                      {realm.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="meta wizard-note">
              Your profile must be public. Include the 4 digit discriminator, i.e. AccountName#9876. Xbox and
              PlayStation account names may include spaces.
            </div>
            <div className="meta wizard-note">
              {POE_REALM_OPTIONS.find((realm) => realm.id === selectedRealm)?.helpText}
            </div>
            <div className="wizard-actions">
              <button className="btn" type="button" disabled={pending} onClick={() => void handleLoadAccount()}>
                {pending ? "Loading Account..." : "Load Account"}
              </button>
            </div>
          </div>
        ) : null}

        {currentStep === "league" ? (
          <div className="wizard-field-grid">
            <label className="wizard-field">
              <span>League</span>
              <select
                className="panel-select wizard-select"
                value={selectedLeague}
                onChange={(event) => {
                  setSelectedLeague(event.target.value);
                  setSelectedCharacter("");
                  setLoadedBuild(null);
                }}
              >
                <option value="">Choose a league</option>
                {availableLeagues.map((league) => (
                  <option key={league} value={league}>
                    {league}
                  </option>
                ))}
              </select>
            </label>
            <div className="wizard-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setCurrentStep("account")}>
                Back
              </button>
              <button className="btn" type="button" onClick={handleContinueLeague}>
                Continue
              </button>
            </div>
          </div>
        ) : null}

        {currentStep === "character" ? (
          <div className="wizard-field-grid">
            <label className="wizard-field">
              <span>Character</span>
              <select
                className="panel-select wizard-select"
                value={selectedCharacter}
                onChange={(event) => {
                  setSelectedCharacter(event.target.value);
                  setLoadedBuild(null);
                }}
              >
                <option value="">Choose a character</option>
                {filteredCharacters.map((character) => {
                  const label = [character.name, character.class, character.level ? `Level ${character.level}` : null]
                    .filter(Boolean)
                    .join(" | ");
                  return (
                    <option key={`${character.name}:${character.league}`} value={String(character.name ?? "")}>
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>
            <div className="meta wizard-note">
              Loading may take a moment as the work is done by your local device.
            </div>
            <div className="wizard-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setCurrentStep("league")}>
                Back
              </button>
              <button className="btn" type="button" disabled={workerPending} onClick={handleContinueCharacter}>
                {workerPending ? "Loading Character..." : "Load Character"}
              </button>
            </div>
          </div>
        ) : null}

        {currentStep === "preset" ? (
          <div className="wizard-field-grid">
            <label className="wizard-field">
              <textarea
                className="code-area wizard-preset-area"
                value={presetInput}
                onChange={(event) => setPresetInput(event.target.value)}
                placeholder="Paste a pob.codes, pobb.in, maxroll.gg, or raw PoB code to apply its configuration to your character."
              />
            </label>
            <div className="meta wizard-note">{presetSummary}</div>
            <div className="wizard-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setCurrentStep("character")}>
                Back
              </button>
              <button className="btn btn-secondary" type="button" disabled={pending} onClick={handleSkipPreset}>
                Continue Without Preset
              </button>
              <button className="btn" type="button" disabled={pending || presetInput.trim().length === 0} onClick={() => void handleLoadPreset()}>
                {pending ? "Loading Preset..." : "Load Preset"}
              </button>
            </div>
          </div>
        ) : null}

        {currentStep === "configure" ? (
          <div className="wizard-field-grid">
            {renderSummaryStrip(buildSummaryParts, "Load a character to see its summary.")}
            <div className="meta wizard-note">
              {loadedPreset
                ? `Guide preset staged with ${loadedPreset.explicitInputCount} explicit values.`
                : "No configs copied. Manually set your own configs below."}
            </div>
            <div className="meta wizard-note">{configureSummary}</div>
            <section className="wizard-configure-section">
              <div className="panel-toolbar wizard-section-heading">
                <h3>Primary Skill</h3>
                <div className="meta">Choose your primary damage skill.</div>
              </div>
              {displayedSkillGroups.length > 0 && primarySkillGroup ? (
                <div className="wizard-field-grid wizard-primary-skill-fields">
                  <label className="wizard-field">
                    <span>Primary Skill Group</span>
                    <select
                      className="panel-select wizard-select"
                      value={String(draftPrimarySkillGroupIndex)}
                      onChange={(event) => {
                        const nextGroupIndex = Number(event.target.value);
                        updateDraftSkillState((nextState) => {
                          nextState.primarySocketGroupIndex = nextGroupIndex;
                          const nextGroup = getSkillGroupBundle(currentSkillsBundle, nextGroupIndex);
                          if (!nextGroup) {
                            return;
                          }

                          const nextGroupState = ensureNextSkillGroupState(nextState, nextGroup);
                          if (
                            !(nextGroup.activeSkills ?? []).some(
                              (entry) => Number(entry.index) === Number(nextGroupState.activeSkillIndex),
                            )
                          ) {
                            nextGroupState.activeSkillIndex = Number(nextGroup.activeSkills?.[0]?.index ?? 1);
                          }
                        });
                      }}
                    >
                      {displayedSkillGroups.map((group) => (
                        <option key={`primary-group:${group.index}`} value={String(group.index)}>
                          {group.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="wizard-field">
                    <span>Primary Active Skill</span>
                    <select
                      className="panel-select wizard-select"
                      value={String(primarySkillGroupState?.activeSkillIndex ?? primaryActiveSkills[0]?.index ?? 1)}
                      disabled={primaryActiveSkills.length === 0 || !primarySkillGroup}
                      onChange={(event) => {
                        const nextSkillIndex = Number(event.target.value);
                        if (!primarySkillGroup) {
                          return;
                        }

                        updateDraftSkillState((nextState) => {
                          const nextGroupState = ensureNextSkillGroupState(nextState, primarySkillGroup);
                          nextGroupState.activeSkillIndex = nextSkillIndex;
                        });
                      }}
                    >
                      {primaryActiveSkills.map((skill) => (
                        <option key={`primary-skill:${skill.index}`} value={String(skill.index)}>
                          {skill.label}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="meta wizard-inline-summary">
                    Current primary DPS target: {primarySkillGroup.label}
                    {primaryActiveSkill?.label ? ` -> ${primaryActiveSkill.label}` : ""}
                    {primarySkillGroup.slot ? ` | ${primarySkillGroup.slot}` : ""}
                  </div>
                </div>
              ) : (
                <div className="meta wizard-empty-state">
                  Load a character first. Primary skill controls will appear once the PoB skills bundle is available.
                </div>
              )}
            </section>

            <section className="wizard-configure-section">
              <div className="panel-toolbar wizard-section-heading">
                <h3>Skill Groups</h3>
                </div>
              {displayedSkillGroups.length > 0 ? (
                <div className="wizard-skill-groups">
                  {displayedSkillGroups.map((group) => {
                    const groupState = getGroupStateForRender(group);
                    const isPrimaryGroup = Number(group.index) === Number(draftPrimarySkillGroupIndex);
                    const selectedActiveSkill =
                      (group.activeSkills ?? []).find(
                        (entry) => Number(entry.index) === Number(groupState.activeSkillIndex ?? 1),
                      ) ??
                      group.activeSkills?.[0] ??
                      null;
                    const summaryParts = [
                      group.slot,
                      selectedActiveSkill?.label,
                      isPrimaryGroup ? "Primary DPS" : null,
                    ].filter(Boolean);
                    const isOpen = Boolean(openSkillGroups[String(group.index)]);

                    return (
                      <details
                        key={`skill-group:${group.index}`}
                        className="wizard-skill-group"
                        open={isOpen}
                        onToggle={(event) => {
                          const nextOpen = event.currentTarget.open;
                          setOpenSkillGroups((current) => ({
                            ...current,
                            [String(group.index)]: nextOpen,
                          }));
                        }}
                      >
                        <summary className="wizard-skill-group-summary">
                          <span className="wizard-skill-group-summary-label">{group.label}</span>
                          <span className="wizard-skill-group-summary-meta">{summaryParts.join(" | ")}</span>
                        </summary>
                        <div className="wizard-skill-group-body">
                          <div className="wizard-toggle-list">
                            <label
                              className={`wizard-skill-toggle${isPrimaryGroup ? " wizard-skill-toggle--accent" : ""}`}
                            >
                              <input
                                type="checkbox"
                                checked={groupState.enabled}
                                onChange={(event) =>
                                  updateDraftSkillState((nextState) => {
                                    ensureNextSkillGroupState(nextState, group).enabled = event.target.checked;
                                  })
                                }
                              />
                              <span className="wizard-skill-toggle-copy">
                                <span className="wizard-skill-toggle-label">Enable Socket Group</span>
                                <span className="wizard-skill-toggle-meta">
                                  {isPrimaryGroup
                                    ? "Primary group participates in the current DPS calculation."
                                    : "Utility groups can be disabled without deleting them."}
                                </span>
                              </span>
                            </label>
                            <label className="wizard-skill-toggle">
                              <input
                                type="checkbox"
                                checked={groupState.includeInFullDPS}
                                onChange={(event) =>
                                  updateDraftSkillState((nextState) => {
                                    ensureNextSkillGroupState(nextState, group).includeInFullDPS = event.target.checked;
                                  })
                                }
                              />
                              <span className="wizard-skill-toggle-copy">
                                <span className="wizard-skill-toggle-label">Include In Full DPS</span>
                                <span className="wizard-skill-toggle-meta">
                                  Controls whether this group contributes to PoB&apos;s combined Full DPS output.
                                </span>
                              </span>
                            </label>
                          </div>

                          <div className="wizard-skill-subheading">Gem Toggles</div>
                          {(group.gems ?? []).length > 0 ? (
                            <div className="wizard-toggle-list">
                              {(group.gems ?? []).map((gem) => {
                                const gemState = groupState.gems?.[Number(gem.index)] ?? {
                                  enabled: gem.enabled !== false,
                                };
                                return (
                                  <label key={`group:${group.index}:gem:${gem.index}`} className="wizard-skill-toggle">
                                    <input
                                      type="checkbox"
                                      checked={gemState.enabled}
                                      onChange={(event) =>
                                        updateDraftSkillState((nextState) => {
                                          const nextGroupState = ensureNextSkillGroupState(nextState, group);
                                          nextGroupState.gems[Number(gem.index)] = {
                                            enabled: event.target.checked,
                                          };
                                        })
                                      }
                                    />
                                    <span className="wizard-skill-toggle-copy">
                                      <span className="wizard-skill-toggle-label">{gem.label}</span>
                                      <span className="wizard-skill-toggle-meta">
                                        {gem.isSupport ? "Support gem" : "Skill gem"}
                                      </span>
                                    </span>
                                  </label>
                                );
                              })}
                            </div>
                          ) : (
                            <div className="meta wizard-empty-state">This socket group has no toggleable gems.</div>
                          )}
                        </div>
                      </details>
                    );
                  })}
                </div>
              ) : (
                <div className="meta wizard-empty-state">
                  Load a character first. Visible socket groups will appear here once the worker returns the live skills bundle.
                </div>
              )}
            </section>

            <section className="wizard-configure-section">
              <div className="panel-toolbar wizard-section-heading">
                <h3>Configuration</h3>
                <div className="meta">These controls are generated from the live PoB Config tab for the imported character.</div>
              </div>
              <label className="wizard-field">
                <span>Search Config Options</span>
                <input
                  className="panel-input"
                  type="search"
                  value={configSearch}
                  onChange={(event) => setConfigSearch(event.target.value)}
                  placeholder="Search visible config controls"
                />
              </label>
              {renderedConfigSections.length > 0 ? (
                <div className="wizard-config-sections">
                  {renderedConfigSections.map((section, index) => {
                    const isOpen = Boolean(openConfigSections[section.key]) || index === 0 || configSearch.trim().length > 0;
                    return (
                      <details
                        key={section.key}
                        className="wizard-config-section"
                        open={isOpen}
                        onToggle={(event) => {
                          const nextOpen = event.currentTarget.open;
                          setOpenConfigSections((current) => ({
                            ...current,
                            [section.key]: nextOpen,
                          }));
                        }}
                      >
                        <summary className="wizard-config-section-summary">{section.title}</summary>
                        <div className="wizard-config-section-body">
                          {section.controls.map((control) => renderConfigControl(control))}
                        </div>
                      </details>
                    );
                  })}
                </div>
              ) : (
                <div className="meta wizard-empty-state">
                  {currentConfigBundle
                    ? configSearch.trim().length > 0
                      ? "No visible PoB config options matched the current search."
                      : "This build does not currently expose any visible PoB config controls."
                    : "Load a character first. Config controls will appear after the worker returns the live bundle."}
                </div>
              )}
            </section>
            <div className="wizard-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setCurrentStep("preset")}>
                Back
              </button>
              <button className="btn" type="button" disabled={workerPending || !hasDraftChanges} onClick={() => void handleUpdateCalculations()}>
                {workerPending ? "Updating..." : "Update Calculations"}
              </button>
              <button className="btn btn-secondary" type="button" disabled={hasDraftChanges} onClick={handleContinueToReview}>
                Continue To Review
              </button>
            </div>
          </div>
        ) : null}

        {currentStep === "review" ? (
          <div className="wizard-field-grid">
            {renderSummaryStrip(buildSummaryParts, "Load a character to see its summary.")}
            <div className="meta wizard-note">{reviewSummary}</div>
            <div className="wizard-actions">
              <button className="btn btn-secondary" type="button" onClick={() => setCurrentStep("configure")}>
                Back
              </button>
              {SHOW_DEBUG_IMPORT_ACTIONS ? (
                <button className="btn btn-secondary" type="button" onClick={() => void handleCopyConfigPreset()}>
                  Copy Config Preset
                </button>
              ) : null}
              <button className="btn btn-secondary" type="button" onClick={() => void handleCopyBuildCode()}>
                Copy PoB Code
              </button>
              <button className="btn" type="button" disabled={viewerPending || hasDraftChanges} onClick={() => void handleOpenInViewer()}>
                {viewerPending ? "Opening Viewer..." : "Open In Viewer"}
              </button>
            </div>
          </div>
        ) : null}
      </section>

      <details className="panel wizard-diagnostics">
        <summary>Diagnostics</summary>
        <pre className="wizard-diagnostics-output">
{JSON.stringify(
  {
    currentStep,
    furthestStep,
    pending,
    viewerPending,
    workerReady,
    workerPending,
    accountInput,
    selectedRealm,
    loadedAccount: profileResult?.accountName ?? null,
    loadedRealm: profileResult?.realm ?? null,
    selectedLeague,
    selectedCharacter,
    hasConfigChanges,
    hasSkillChanges,
    hasDraftChanges,
    loadedPreset: loadedPreset
      ? {
          source: loadedPreset.source,
          resolvedUrl: loadedPreset.resolvedUrl,
          explicitInputCount: loadedPreset.explicitInputCount,
        }
      : null,
    loadedBuild: loadedBuild
      ? {
          mode: loadedBuild.mode,
          label: loadedBuild.label,
          loadBuildMs: loadedBuild.loadBuildMs,
          recalcMs: loadedBuild.recalcMs,
          summary: loadedBuild.summary,
          requirements: loadedBuild.requirements,
          profileMeta: loadedBuild.profileMeta,
        }
      : null,
    skillsBundle: currentSkillsBundle
      ? {
          primarySocketGroupIndex: currentSkillsBundle.primarySocketGroupIndex,
          socketGroupCount: currentSkillsBundle.socketGroups.length,
          displayedSkillGroupCount: displayedSkillGroups.length,
        }
      : null,
    availableLeagueCount: availableLeagues.length,
    visibleCharacterCount: filteredCharacters.length,
    workerStatus,
    workerMetrics,
    workerLogTail: workerLogs.slice(-20),
  },
  null,
  2,
)}
        </pre>
      </details>
    </div>
  );
}
