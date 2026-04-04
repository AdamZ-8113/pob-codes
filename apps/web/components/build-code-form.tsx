"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { buildApiUrl } from "../lib/api-base";
import { isLocalHostname } from "../lib/local-host";
import type { SamplePobFile } from "../lib/sample-pob-files";

export function BuildCodeForm() {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFixture, setLoadingFixture] = useState(false);
  const [sampleFiles, setSampleFiles] = useState<SamplePobFile[]>([]);
  const [selectedSampleId, setSelectedSampleId] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLocalHostname(window.location.hostname)) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const res = await fetch("/api/pob-samples", { cache: "no-store" });
        if (!res.ok) {
          return;
        }

        const body = (await res.json()) as { samples?: SamplePobFile[] } | null;
        if (cancelled) {
          return;
        }

        const nextSampleFiles = Array.isArray(body?.samples) ? body.samples : [];
        setSampleFiles(nextSampleFiles);
        setSelectedSampleId((current) => current || nextSampleFiles[0]?.id || "");
      } catch {
        if (!cancelled) {
          setSampleFiles([]);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  async function onLoadFixture() {
    if (!selectedSampleId) {
      setError("No sample build is available.");
      return;
    }

    setLoadingFixture(true);
    setError(null);

    try {
      const res = await fetch(`/api/pob-samples/${encodeURIComponent(selectedSampleId)}`);
      if (!res.ok) {
        throw new Error("Sample build load failed");
      }

      setCode((await res.text()).trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sample build load failed");
    } finally {
      setLoadingFixture(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = code.trim();
    if (!trimmed) {
      setError("Paste a Path of Building code or supported build URL first.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(buildApiUrl("/pob"), {
        method: "POST",
        body: trimmed,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Upload failed");
      }

      const body = (await res.json()) as { id: string };
      router.push(`/b/${body.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="panel">
      <textarea
        className="code-area"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste a Path of Building export string, pob.codes or pobb.in link, Maxroll PoB link, Pastebin, poe.ninja, or similar..."
      />
      <div className="build-code-form-actions">
        {sampleFiles.length > 0 ? (
          <div className="build-code-form-samples">
            <select
              value={selectedSampleId}
              onChange={(e) => setSelectedSampleId(e.target.value)}
              disabled={loading || loadingFixture}
              aria-label="Sample build"
            >
              {sampleFiles.map((sampleFile) => (
                <option key={sampleFile.id} value={sampleFile.id}>
                  {sampleFile.label}
                </option>
              ))}
            </select>
            <button className="btn btn-secondary" type="button" disabled={loading || loadingFixture} onClick={onLoadFixture}>
              {loadingFixture ? "Loading Sample..." : "Load Sample"}
            </button>
          </div>
        ) : null}
        <button className="btn build-code-form-submit" type="submit" disabled={loading || loadingFixture}>
          {loading ? "Uploading..." : "Open Build"}
        </button>
        <span className="meta build-code-form-meta">PoE1 only. Read-only. Supports common PoB import URLs</span>
      </div>
      {error && (
        <div className="error-box" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </form>
  );
}
