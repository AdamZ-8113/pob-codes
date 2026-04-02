"use client";

import React from "react";
import { useEffect, useMemo, useState } from "react";

import type { BuildPayload, GemPayload, SkillGroupPayload } from "@pobcodes/shared-types";

import { getSelectedSkillSet, getSkillSetLabel } from "../lib/build-viewer-selection";
import { GEM_COLOURS, GEM_COLOURS_BY_NAME } from "../lib/generated/gem-colours";
import { GEM_DETAILS } from "../lib/generated/gem-details";
import { STAT_DESCRIPTIONS } from "../lib/generated/stat-descriptions";
import { resolveGemIconPath } from "../lib/icon-paths";
import { isWeaponSwapSlot } from "../lib/weapon-swap";

const LEFT_COLUMN_PRIMARY_SLOTS = ["Weapon 1", "Weapon 2", "Gloves"];
const LEFT_COLUMN_SWAP_SLOTS = ["Weapon 1 Swap", "Weapon 2 Swap", "Off Hand 2", "Off Hand Swap"];
const LEFT_COLUMN_ACCESSORY_SLOTS = ["Amulet", "Ring 3", "Ring 1", "Ring 2"];
const RIGHT_COLUMN_SLOTS = ["Helmet", "Body Armour", "Boots"];
const RECOGNISED_PANEL_SLOTS = new Set([
  ...LEFT_COLUMN_PRIMARY_SLOTS,
  ...LEFT_COLUMN_SWAP_SLOTS,
  ...LEFT_COLUMN_ACCESSORY_SLOTS,
  ...RIGHT_COLUMN_SLOTS,
]);

function getInitialSkillSetId(payload: BuildPayload): number | undefined {
  return payload.activeSkillSetId ?? payload.skillSets.find((set) => set.active)?.id ?? payload.skillSets[0]?.id;
}

interface SkillsPanelProps {
  payload: BuildPayload;
  showWeaponSwap?: boolean;
  skillSetId?: number;
  onSkillSetChange?: (skillSetId: number) => void;
}

interface SkillCard {
  key: string;
  slot?: string;
  label?: string;
  groups: SkillGroupPayload[];
}

interface SkillGemRow {
  key: string;
  gem: GemPayload;
  displayName: string;
  connector: "none" | "middle" | "last";
  groupDivider: boolean;
}

function isCorruptedGem(gem: GemPayload): boolean {
  if (gem.corrupted) {
    return true;
  }

  if (gem.quality > 20) {
    return true;
  }

  if (!gem.gemId) {
    return false;
  }

  const details = GEM_DETAILS[gem.gemId];
  return details != null && gem.level > details.maxLevel;
}

export function SkillsPanel({
  onSkillSetChange,
  payload,
  showWeaponSwap = false,
  skillSetId: controlledSkillSetId,
}: SkillsPanelProps) {
  const [internalSkillSetId, setInternalSkillSetId] = useState<number | undefined>(() => getInitialSkillSetId(payload));
  const skillSetId = controlledSkillSetId ?? internalSkillSetId;
  const activeSet = getSelectedSkillSet(payload, skillSetId);
  const skillCards = useMemo(
    () =>
      buildSkillCards((activeSet?.groups ?? []).filter((group) => showWeaponSwap || !isWeaponSwapSlot(group.slot))),
    [activeSet, showWeaponSwap],
  );

  useEffect(() => {
    if (controlledSkillSetId === undefined) {
      setInternalSkillSetId(getInitialSkillSetId(payload));
    }
  }, [controlledSkillSetId, payload]);

  function handleSkillSetChange(nextSkillSetId: number) {
    if (controlledSkillSetId === undefined) {
      setInternalSkillSetId(nextSkillSetId);
    }

    onSkillSetChange?.(nextSkillSetId);
  }

  return (
    <section className="panel skills-panel">
      <div className="panel-toolbar">
        <h2>Gems</h2>
        {payload.skillSets.length > 1 && (
          <select
            aria-label="Skill Set"
            className="panel-select"
            value={activeSet?.id ?? ""}
            onChange={(event) => handleSkillSetChange(Number(event.target.value))}
          >
            {payload.skillSets.map((set, index) => (
              <option key={`skill-set:${set.id}`} value={set.id}>
                {getSkillSetLabel(index, set.title)}
              </option>
            ))}
          </select>
        )}
      </div>
      {renderSkillCards(skillCards)}
    </section>
  );
}

function buildSkillCards(groups: SkillGroupPayload[]): SkillCard[] {
  const cards: SkillCard[] = [];
  const cardsBySlot = new Map<string, SkillCard>();

  for (const group of groups) {
    if (!group.enabled || !group.gems.some((gem) => gem.enabled)) {
      continue;
    }

    const slot = group.slot?.trim();
    if (!slot) {
      cards.push({
        key: `group:${group.id}`,
        label: group.label?.trim() || undefined,
        groups: [group],
      });
      continue;
    }

    let card = cardsBySlot.get(slot);
    if (!card) {
      card = {
        key: `slot:${slot}`,
        slot,
        groups: [],
      };
      cardsBySlot.set(slot, card);
      cards.push(card);
    }

    card.groups.push(group);
  }

  return cards;
}

function renderSkillCards(cards: SkillCard[]): React.ReactNode {
  const slottedBySlot = new Map<string, SkillCard>();
  const unslotted: SkillCard[] = [];

  for (const card of cards) {
    if (!card.slot || !RECOGNISED_PANEL_SLOTS.has(card.slot)) {
      unslotted.push(card);
      continue;
    }

    slottedBySlot.set(card.slot, card);
  }

  const leftColumnCards = [...LEFT_COLUMN_PRIMARY_SLOTS, ...LEFT_COLUMN_SWAP_SLOTS, ...LEFT_COLUMN_ACCESSORY_SLOTS]
    .map((slot) => slottedBySlot.get(slot))
    .filter((card): card is SkillCard => Boolean(card));
  const rightColumnCards = RIGHT_COLUMN_SLOTS.map((slot) => slottedBySlot.get(slot)).filter(
    (card): card is SkillCard => Boolean(card),
  );

  return (
    <>
      <div className="skills-columns">
        <div className="skills-column skills-column-left">
          {leftColumnCards.map((card) => renderSkillCard(card))}
        </div>
        <div className="skills-column skills-column-right">
          {rightColumnCards.map((card) => renderSkillCard(card))}
        </div>
      </div>
      {unslotted.length > 0 && (
        <div className="skills-unslotted">
          {unslotted.map((card) => renderSkillCard(card))}
        </div>
      )}
    </>
  );
}

function renderSkillCard(card: SkillCard): React.ReactNode {
  const gemRows = buildGemRows(card.groups);
  if (gemRows.length === 0) {
    return null;
  }

  return (
    <div className="item-box skill-group-card" key={card.key}>
      {(card.slot || card.label) && <div className="skill-group-slot-badge">{card.slot ?? card.label}</div>}
      <div className="gem-group">{gemRows.map((row) => renderGemRow(row))}</div>
    </div>
  );
}

function renderGemRow(row: SkillGemRow): React.ReactNode {
  const colour = (row.gem.gemId && GEM_COLOURS[row.gem.gemId]) || GEM_COLOURS_BY_NAME[row.displayName] || "w";
  return (
    <React.Fragment key={row.key}>
      {row.groupDivider && <div className="gem-group-divider" />}
      <div className="gem-row-wrapper">
        <div className="gem-row">
          {row.gem.support && (
            <span className={`gem-connector gem-connector-${row.connector}`} aria-hidden="true" />
          )}
          <span
            className={`gem-name gem-colour-${colour} ${row.gem.support ? "gem-name-support" : "gem-name-active"}`}
            title={row.displayName}
          >
            {row.displayName}
          </span>
          {(row.gem.level > 1 || row.gem.quality > 0) && (
            <span className="gem-lq">{row.gem.level}/{row.gem.quality}</span>
          )}
        </div>
        <div className="gem-tooltip-panel gem-tooltip-panel--left">
          {renderGemTooltip(row.gem, row.displayName)}
        </div>
      </div>
    </React.Fragment>
  );
}

function renderGemTooltip(gem: GemPayload, displayName: string): React.ReactNode {
  const details = (gem.gemId && GEM_DETAILS[gem.gemId]) || undefined;
  const corrupted = isCorruptedGem(gem);
  const levelIndex = details ? Math.min(gem.level, details.maxLevel) - 1 : -1;
  const levelData = details ? (details.levels[levelIndex] ?? details.levels[details.levels.length - 1]) : undefined;
  const iconSrc = resolveGemIconPath(gem);
  // Active gem PNGs are 234×78 sprites (skill art left, gem crystal right).
  // Crop to the rightmost 78px by scaling to 108px wide and offsetting -72px.
  const isSprite = !!iconSrc && iconSrc.includes("/art/Gems/") && !iconSrc.includes("/Support/") && !iconSrc.endsWith(".svg");

  return (
    <div className="poe-tooltip poe-tooltip-gem">
      <div className="poe-header">
        <div className="poe-header-l" />
        <div className="poe-header-m poe-header-m--gem">
          {iconSrc && (
            isSprite ? (
              <div className="poe-gem-icon-wrap" aria-hidden="true">
                <img className="poe-gem-icon poe-gem-icon-sprite poe-gem-icon-sprite-base" src={iconSrc} alt="" />
                <img className="poe-gem-icon poe-gem-icon-sprite poe-gem-icon-sprite-overlay" src={iconSrc} alt="" />
              </div>
            ) : (
              <img className="poe-gem-icon" src={iconSrc} alt="" aria-hidden="true" />
            )
          )}
          <div className="poe-name">{displayName}</div>
        </div>
        <div className="poe-header-r" />
      </div>

      {(details?.tags || details) && (
        <>
          <div className="poe-sep" />
          {details?.tags && <div className="poe-gem-tags">{details.tags}</div>}
          <div className="poe-gem-level-line">
            Level: <span className="poe-stat-value">{gem.level}{details && gem.level >= details.maxLevel ? " (Max)" : ""}</span>
          </div>
          {levelData?.manaMultiplier != null && (
            <div className="poe-gem-level-line">
              Cost &amp; Reservation Multiplier: <span className="poe-stat-value">{100 + levelData.manaMultiplier}%</span>
            </div>
          )}
          {gem.quality > 0 && (
            <div className="poe-gem-level-line">
              Quality: <span className="poe-stat-value">+{gem.quality}%</span>
            </div>
          )}
          {corrupted && <div className="poe-gem-level-line poe-gem-level-line--corrupted">Corrupted</div>}
        </>
      )}

      {levelData && details && (levelData.manaReserve != null || levelData.manaCost != null || levelData.cooldown != null || levelData.storedUses != null || details.castTime != null || levelData.critChance != null || levelData.damageMult != null) && (
        <>
          <div className="poe-sep" />
          <div className="poe-mods">
            {levelData.manaReserve != null && (
              <div className="poe-stat-row">
                <span className="poe-stat-label">Reservation: </span>
                <span className="poe-stat-value">{levelData.manaReserve}% Mana</span>
              </div>
            )}
            {levelData.manaCost != null && (
              <div className="poe-stat-row">
                <span className="poe-stat-label">Mana Cost: </span>
                <span className="poe-stat-value">{levelData.manaCost}</span>
              </div>
            )}
            {levelData.cooldown != null && (
              <div className="poe-stat-row">
                <span className="poe-stat-label">Cooldown Time: </span>
                <span className="poe-stat-value">{levelData.cooldown.toFixed(2)} sec</span>
              </div>
            )}
            {levelData.storedUses != null && (
              <div className="poe-stat-row">
                <span className="poe-stat-label">Can Store </span>
                <span className="poe-stat-value">{levelData.storedUses} Use(s)</span>
              </div>
            )}
            {details.castTime != null && (
              <div className="poe-stat-row">
                <span className="poe-stat-label">Cast Time: </span>
                <span className="poe-stat-value">
                  {details.castTime === 0 ? "Instant" : `${details.castTime.toFixed(2)} sec`}
                </span>
              </div>
            )}
            {levelData.critChance != null && (
              <div className="poe-stat-row">
                <span className="poe-stat-label">Critical Strike Chance: </span>
                <span className="poe-stat-value">{levelData.critChance.toFixed(2)}%</span>
              </div>
            )}
            {levelData.damageMult != null && (
              <div className="poe-stat-row">
                <span className="poe-stat-label">Effectiveness of Added Damage: </span>
                <span className="poe-stat-value">{Math.round(levelData.damageMult * 100)}%</span>
              </div>
            )}
          </div>
        </>
      )}

      {(levelData?.levelReq != null && levelData.levelReq > 1) || details?.reqStr || details?.reqDex || details?.reqInt ? (
        <>
          <div className="poe-sep" />
          <div className="poe-mods">
            <div className="poe-stat-row poe-stat-level-req">
              {levelData?.levelReq != null && levelData.levelReq > 1 && (
                <>Requires Level <span className="poe-stat-value">{levelData.levelReq}</span></>
              )}
              {details?.reqStr ? <>, Str <span className="poe-stat-value">{details.reqStr}</span></> : null}
              {details?.reqDex ? <>, Dex <span className="poe-stat-value">{details.reqDex}</span></> : null}
              {details?.reqInt ? <>, Int <span className="poe-stat-value">{details.reqInt}</span></> : null}
            </div>
          </div>
        </>
      ) : null}

      {details?.description && (
        <>
          <div className="poe-sep" />
          <div className="poe-gem-description">{details.description}</div>
        </>
      )}

      {levelData && details && details.statKeys.length > 0 && (
        <>
          <div className="poe-sep" />
          <div className="poe-gem-stat-lines">
            {details.statKeys.map((key, i) => {
              const template = STAT_DESCRIPTIONS[key];
              const rawValue = levelData.statValues?.[i];
              if (!template || rawValue == null) return null;
              // Skip base damage stats — their raw values need PoB's engine to scale
              if (key.includes("_base_") || key.includes("base_damage")) return null;
              const value = Number.isInteger(rawValue) ? rawValue : Math.round(rawValue * 10) / 10;
              const line = template.replace(/\{0(?::([^}]+))?\}/g, (_, fmt) => {
                if (fmt === "+d" || fmt === "+") return value >= 0 ? `+${Math.round(Number(value))}` : String(Math.round(Number(value)));
                if (fmt === "d") return String(Math.round(Number(value)));
                return String(value);
              });
              return (
                <div key={`${key}:${i}`} className="poe-gem-stat-line">{line}</div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function buildGemRows(groups: SkillGroupPayload[]): SkillGemRow[] {
  const rows: SkillGemRow[] = [];

  for (const [groupIndex, group] of groups.entries()) {
    const enabledGems = group.gems
      .filter((gem) => gem.enabled)
      .map((gem) => ({ gem, displayName: getGemDisplayName(gem) }))
      .filter((entry) => entry.displayName.length > 0);
    const supports = enabledGems.filter((entry) => entry.gem.support);

    for (const [gemIndex, entry] of enabledGems.entries()) {
      const { gem, displayName } = entry;
      let connector: SkillGemRow["connector"] = "none";
      if (gem.support) {
        const supportIndex = supports.findIndex((candidate) => candidate.gem === gem);
        connector = supportIndex === supports.length - 1 ? "last" : "middle";
      }

      rows.push({
        key: `${group.id}:${gemIndex}:${gem.nameSpec}`,
        gem,
        displayName,
        connector,
        groupDivider: groupIndex > 0 && gemIndex === 0,
      });
    }
  }

  return rows;
}

function getGemDisplayName(gem: GemPayload): string {
  const explicitName = gem.nameSpec.trim();
  if (explicitName.length > 0) {
    return explicitName;
  }

  if (gem.gemId) {
    const derivedName = GEM_DETAILS[gem.gemId]?.name?.trim();
    if (derivedName) {
      return derivedName;
    }
  }

  return "";
}
