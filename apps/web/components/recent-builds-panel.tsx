"use client";

import Link from "next/link";
import { Fragment, useEffect, useRef, useState, type RefObject } from "react";

import { formatBuildTitleWithLevel } from "../lib/build-overview";
import { copyTextToClipboard } from "../lib/clipboard";
import {
  readRecentBuilds,
  removeRecentBuild,
  setRecentBuildNickname,
  setRecentBuildPinned,
  type RecentBuildEntry,
} from "../lib/recent-builds";

const viewedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function RecentBuildsPanel() {
  const [recentBuilds, setRecentBuilds] = useState<RecentBuildEntry[]>([]);
  const [shareFeedbackId, setShareFeedbackId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const syncRecentBuilds = () => {
      setRecentBuilds(readRecentBuilds());
    };

    syncRecentBuilds();
    window.addEventListener("storage", syncRecentBuilds);

    return () => {
      window.removeEventListener("storage", syncRecentBuilds);
    };
  }, []);

  useEffect(() => {
    if (!shareFeedbackId) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setShareFeedbackId(null);
    }, 1200);

    return () => window.clearTimeout(timeoutId);
  }, [shareFeedbackId]);

  useEffect(() => {
    if (!renamingId || !renameInputRef.current) {
      return;
    }

    const input = renameInputRef.current;
    input.focus();
    requestAnimationFrame(() => {
      input.setSelectionRange(0, 0);
    });
  }, [renamingId]);

  const pinnedBuilds = recentBuilds.filter((entry) => entry.pinned);
  const unpinnedBuilds = recentBuilds.filter((entry) => !entry.pinned);

  if (pinnedBuilds.length === 0 && unpinnedBuilds.length === 0) {
    return null;
  }

  async function handleShareBuild(entry: RecentBuildEntry) {
    try {
      await copyTextToClipboard(new URL(`/b/${encodeURIComponent(entry.id)}`, window.location.origin).toString());
      setShareFeedbackId(entry.id);
    } catch {
      // Ignore clipboard failures in unsupported browser contexts.
    }
  }

  function handleTogglePinned(entry: RecentBuildEntry) {
    setRecentBuilds(setRecentBuildPinned(entry.id, !entry.pinned));
  }

  function handleRemoveBuild(entry: RecentBuildEntry) {
    setRecentBuilds(removeRecentBuild(entry.id));
    if (shareFeedbackId === entry.id) {
      setShareFeedbackId(null);
    }
    if (renamingId === entry.id) {
      setRenamingId(null);
      setRenameDraft("");
    }
  }

  function handleStartRename(entry: RecentBuildEntry, displayTitle: string) {
    setRenamingId(entry.id);
    setRenameDraft(displayTitle);
  }

  function handleCancelRename() {
    setRenamingId(null);
    setRenameDraft("");
  }

  function handleSubmitRename(entry: RecentBuildEntry) {
    if (!renameDraft.trim()) {
      handleCancelRename();
      return;
    }

    const defaultTitle = formatRecentBuildTitle(entry);
    const nextTitle = renameDraft.trim() === defaultTitle ? "" : renameDraft;

    setRecentBuilds(setRecentBuildNickname(entry.id, nextTitle));
    setRenamingId(null);
    setRenameDraft("");
  }

  return (
    <>
      {pinnedBuilds.length > 0 ? (
        <RecentBuildSection
          entries={pinnedBuilds}
          heading="Pinned"
          onRemoveBuild={handleRemoveBuild}
          onShareBuild={handleShareBuild}
          onStartRename={handleStartRename}
          onSubmitRename={handleSubmitRename}
          onTogglePinned={handleTogglePinned}
          renameInputRef={renameInputRef}
          renameDraft={renameDraft}
          renamingId={renamingId}
          setRenameDraft={setRenameDraft}
          shareFeedbackId={shareFeedbackId}
          onCancelRename={handleCancelRename}
        />
      ) : null}
      {unpinnedBuilds.length > 0 ? (
        <RecentBuildSection
          entries={unpinnedBuilds}
          heading="Recently Viewed"
          onRemoveBuild={handleRemoveBuild}
          onShareBuild={handleShareBuild}
          onStartRename={handleStartRename}
          onSubmitRename={handleSubmitRename}
          onTogglePinned={handleTogglePinned}
          renameInputRef={renameInputRef}
          renameDraft={renameDraft}
          renamingId={renamingId}
          setRenameDraft={setRenameDraft}
          shareFeedbackId={shareFeedbackId}
          onCancelRename={handleCancelRename}
        />
      ) : null}
    </>
  );
}

interface RecentBuildSectionProps {
  entries: RecentBuildEntry[];
  heading: string;
  onCancelRename: () => void;
  onRemoveBuild: (entry: RecentBuildEntry) => void;
  onShareBuild: (entry: RecentBuildEntry) => Promise<void>;
  onStartRename: (entry: RecentBuildEntry, displayTitle: string) => void;
  onSubmitRename: (entry: RecentBuildEntry) => void;
  onTogglePinned: (entry: RecentBuildEntry) => void;
  renameInputRef: RefObject<HTMLInputElement | null>;
  renameDraft: string;
  renamingId: string | null;
  setRenameDraft: (value: string) => void;
  shareFeedbackId: string | null;
}

function RecentBuildSection({
  entries,
  heading,
  onCancelRename,
  onRemoveBuild,
  onShareBuild,
  onStartRename,
  onSubmitRename,
  onTogglePinned,
  renameInputRef,
  renameDraft,
  renamingId,
  setRenameDraft,
  shareFeedbackId,
}: RecentBuildSectionProps) {
  return (
    <section className="panel recent-builds-panel recent-build-section">
      <h2 className="recent-build-section-heading">{heading}</h2>
      <ul className="recent-builds-list">
        {entries.map((entry) => {
          const displayTitle = getRecentBuildDisplayTitle(entry);
          const defaultTitle = formatBuildTitleWithLevel(entry.title, entry.level);

          return (
            <li key={entry.id} className="recent-build-row">
              <div className="recent-build-header">
                <div className="recent-build-copy">
                  <Link href={`/b/${encodeURIComponent(entry.id)}`} className="recent-build-link" title={defaultTitle}>
                    {displayTitle}
                  </Link>
                  <div className="recent-build-inline recent-build-summary-row">
                    {buildRecentBuildSummaryParts(entry).map((part, index) => (
                      <Fragment key={`${entry.id}:${part.key}`}>
                        {index > 0 ? <span className="recent-build-divider">|</span> : null}
                        {renderRecentBuildSummaryPart(part)}
                      </Fragment>
                    ))}
                  </div>
                </div>
                <div className="recent-build-side">
                  <div className="recent-build-side-top">
                    <div className="recent-build-actions">
                      <button
                        aria-label={`Copy link for ${displayTitle}`}
                        className="btn btn-secondary recent-build-share-button"
                        type="button"
                        onClick={() => void onShareBuild(entry)}
                      >
                        Copy Link
                      </button>
                    </div>
                    <div className="recent-build-icon-actions">
                      <button
                        aria-label={`${entry.pinned ? "Unpin" : "Pin"} ${displayTitle}`}
                        className={`recent-build-icon-button${entry.pinned ? " recent-build-icon-button--active" : ""}`}
                        type="button"
                        onClick={() => onTogglePinned(entry)}
                      >
                        <PinIcon />
                      </button>
                      <button
                        aria-label={`Rename ${displayTitle}`}
                        className="recent-build-icon-button"
                        type="button"
                        onClick={() => onStartRename(entry, displayTitle)}
                      >
                        <PencilIcon />
                      </button>
                      <button
                        aria-label={`Remove ${displayTitle}`}
                        className="recent-build-icon-button recent-build-icon-button--danger"
                        type="button"
                        onClick={() => onRemoveBuild(entry)}
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </div>
                  {shareFeedbackId === entry.id ? (
                    <span className="recent-build-share-feedback" role="status" aria-live="polite">
                      Copied
                    </span>
                  ) : null}
                  <div className="meta recent-build-viewed">{formatViewedAt(entry.viewedAt)}</div>
                </div>
              </div>
              {renamingId === entry.id ? (
                <form
                  className="recent-build-rename-form"
                  onSubmit={(event) => {
                    event.preventDefault();
                    onSubmitRename(entry);
                  }}
                >
                  <input
                    aria-label={`Nickname for ${defaultTitle}`}
                    className="input recent-build-rename-input"
                    maxLength={120}
                    ref={renameInputRef}
                    type="text"
                    value={renameDraft}
                    onChange={(event) => setRenameDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Escape") {
                        event.preventDefault();
                        onCancelRename();
                      }
                    }}
                  />
                  <button className="btn btn-secondary" type="submit">
                    Save
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={onCancelRename}>
                    Cancel
                  </button>
                </form>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function formatViewedAt(value: string) {
  const viewedAtDate = new Date(value);
  if (Number.isNaN(viewedAtDate.getTime())) {
    return value;
  }

  return viewedAtFormatter.format(viewedAtDate);
}

function formatRecentBuildTitle(entry: RecentBuildEntry) {
  return formatBuildTitleWithLevel(entry.title, entry.level);
}

function getRecentBuildDisplayTitle(entry: RecentBuildEntry) {
  return entry.nickname?.trim() || formatRecentBuildTitle(entry);
}

function buildRecentBuildSummaryParts(entry: RecentBuildEntry) {
  const parts: Array<
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
        values: string[];
      }
    | {
        key: string;
        kind: "text";
        value: string;
      }
  > = [];

  if (entry.life) {
    parts.push({
      key: "life",
      kind: "metric",
      label: "Life:",
      tone: "life",
      value: entry.life,
    });
  }

  if (entry.energyShield) {
    parts.push({
      key: "energy-shield",
      kind: "metric",
      label: "ES:",
      tone: "energy-shield",
      value: entry.energyShield,
    });
  }

  if (entry.mana) {
    parts.push({
      key: "mana",
      kind: "metric",
      label: "Mana:",
      tone: "mana",
      value: entry.mana,
    });
  }

  if (entry.ehp) {
    parts.push({
      annotation: entry.guardAnnotation ? `(${entry.guardAnnotation})` : undefined,
      key: "ehp",
      kind: "metric",
      label: "eHP:",
      tone: "ehp",
      value: entry.ehp,
    });
  }

  if (entry.dps) {
    parts.push({
      key: "dps",
      kind: "metric",
      label: "DPS:",
      tone: "dps",
      value: entry.dps,
    });
  }

  if (entry.resistances) {
    parts.push({
      key: "resistances",
      kind: "resistances",
      values: entry.resistances.split("/").map((value) => value.trim()).filter(Boolean),
    });
  }

  if (parts.length === 0) {
    if (entry.patchVersion) {
      parts.push({
        key: "patch-version",
        kind: "text",
        value: entry.patchVersion,
      });
    }

    if (entry.ehp) {
      parts.push({
        key: "fallback-ehp",
        kind: "metric",
        label: "eHP:",
        tone: "ehp",
        value: entry.ehp,
      });
    }

    if (entry.dps) {
      parts.push({
        key: "fallback-dps",
        kind: "metric",
        label: "DPS:",
        tone: "dps",
        value: entry.dps,
      });
    }
  }

  return parts;
}

function renderRecentBuildSummaryPart(part: ReturnType<typeof buildRecentBuildSummaryParts>[number]) {
  if (part.kind === "text") {
    return <span className="recent-build-detail">{part.value}</span>;
  }

  if (part.kind === "resistances") {
    const tones = ["fire", "cold", "lightning", "chaos"] as const;

    return (
      <span className="build-loadout-stat recent-build-summary-stat recent-build-summary-stat--resistances">
        <span className="build-loadout-stat-label">Res:</span>
        <span className="build-loadout-resistances">
          {part.values.map((value, index) => (
            <Fragment key={`res:${value}:${index}`}>
              {index > 0 ? <span className="build-loadout-resistance-separator">/</span> : null}
              <span className={`build-loadout-resistance build-loadout-stat--${tones[index] ?? "chaos"}`}>{value}</span>
            </Fragment>
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

function PinIcon() {
  return (
    <svg aria-hidden="true" className="recent-build-icon" viewBox="0 0 16 16">
      <path
        d="m8 1.65 1.77 3.59 3.96.58-2.86 2.79.68 3.94L8 10.69l-3.55 1.86.68-3.94L2.27 5.82l3.96-.58L8 1.65Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.45"
      />
    </svg>
  );
}

function PencilIcon() {
  return (
    <svg aria-hidden="true" className="recent-build-icon" viewBox="0 0 16 16">
      <path
        d="M11.93 1.57a1.75 1.75 0 0 1 2.47 2.47L6 12.43 2.5 13.5l1.07-3.5 8.36-8.43ZM10.87 3.7 4.81 9.81l-.49 1.61 1.61-.49 6.11-6.06-1.17-1.17Z"
        fill="currentColor"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg aria-hidden="true" className="recent-build-icon" viewBox="0 0 16 16">
      <path
        d="M6.5 1.5h3a1 1 0 0 1 1 1V3H13a.75.75 0 0 1 0 1.5h-.6l-.58 8.08A1.5 1.5 0 0 1 10.32 14H5.68a1.5 1.5 0 0 1-1.5-1.42L3.6 4.5H3A.75.75 0 0 1 3 3h2.5v-.5a1 1 0 0 1 1-1Zm2 0H7v.5h1.5v-.5ZM5.68 12.5h4.64l.57-8H5.11l.57 8Zm.82-6.25a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 .75-.75Zm3 0a.75.75 0 0 1 .75.75v3.5a.75.75 0 0 1-1.5 0V7a.75.75 0 0 1 .75-.75Z"
        fill="currentColor"
      />
    </svg>
  );
}
