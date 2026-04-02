"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { formatBuildTitleWithLevel } from "../lib/build-overview";
import { copyTextToClipboard } from "../lib/clipboard";
import { readRecentBuilds, type RecentBuildEntry } from "../lib/recent-builds";

const viewedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function RecentBuildsPanel() {
  const [recentBuilds, setRecentBuilds] = useState<RecentBuildEntry[]>([]);
  const [shareFeedbackId, setShareFeedbackId] = useState<string | null>(null);

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

  if (recentBuilds.length === 0) {
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

  return (
    <section className="panel recent-builds-panel">
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Recently Viewed</h2>
      <ul className="recent-builds-list">
        {recentBuilds.map((entry) => (
          <li key={entry.id} className="recent-build-row">
            <div className="recent-build-copy">
              <div className="recent-build-inline">
                <Link href={`/b/${encodeURIComponent(entry.id)}`} className="recent-build-link">
                  {formatRecentBuildTitle(entry)}
                </Link>
                {entry.ehp ? <span className="recent-build-divider">|</span> : null}
                {entry.ehp ? <span className="recent-build-detail">eHP:{entry.ehp}</span> : null}
                {entry.dps ? <span className="recent-build-divider">|</span> : null}
                {entry.dps ? <span className="recent-build-detail">DPS:{entry.dps}</span> : null}
                {entry.patchVersion ? <span className="recent-build-divider">|</span> : null}
                {entry.patchVersion ? <span className="recent-build-detail">{entry.patchVersion}</span> : null}
              </div>
              <div className="meta recent-build-viewed">
                <code>/b/{entry.id}</code> | Viewed {formatViewedAt(entry.viewedAt)}
              </div>
            </div>
            <div className="recent-build-actions">
              <button
                aria-label={`Share ${formatRecentBuildTitle(entry)}`}
                className="btn btn-secondary recent-build-share-button"
                type="button"
                onClick={() => void handleShareBuild(entry)}
              >
                Share PoB
              </button>
              {shareFeedbackId === entry.id ? (
                <span className="recent-build-share-feedback" role="status" aria-live="polite">
                  Copied
                </span>
              ) : null}
            </div>
          </li>
        ))}
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
