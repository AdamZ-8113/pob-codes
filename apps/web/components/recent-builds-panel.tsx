"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { readRecentBuilds, type RecentBuildEntry } from "../lib/recent-builds";

const viewedAtFormatter = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
});

export function RecentBuildsPanel() {
  const [recentBuilds, setRecentBuilds] = useState<RecentBuildEntry[]>([]);

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

  if (recentBuilds.length === 0) {
    return null;
  }

  return (
    <section className="panel" style={{ marginTop: 16 }}>
      <h2 style={{ marginTop: 0, marginBottom: 12 }}>Recently Viewed</h2>
      <ul style={{ display: "grid", gap: 12, listStyle: "none", margin: 0, padding: 0 }}>
        {recentBuilds.map((entry) => (
          <li key={entry.id}>
            <Link href={`/b/${encodeURIComponent(entry.id)}`} style={{ fontWeight: 600 }}>
              {entry.title}
            </Link>
            <div className="meta" style={{ marginTop: 4 }}>
              <code>/b/{entry.id}</code> · Viewed {formatViewedAt(entry.viewedAt)}
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
