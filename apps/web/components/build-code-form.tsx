"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { buildApiUrl } from "../lib/api-base";
import type { SamplePobFile } from "../lib/sample-pob-files";

interface BuildCodeFormProps {
  sampleFiles?: SamplePobFile[];
}

export function BuildCodeForm({ sampleFiles = [] }: BuildCodeFormProps) {
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingFixture, setLoadingFixture] = useState(false);
  const [selectedSampleId, setSelectedSampleId] = useState(sampleFiles[0]?.id ?? "");
  const router = useRouter();

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
      <h2>Paste PoB Code or Build URL</h2>
      <textarea
        className="code-area"
        value={code}
        onChange={(e) => setCode(e.target.value)}
        placeholder="Paste a Path of Building export string, pobb.in link, Maxroll PoB link, Pastebin, poe.ninja, or similar..."
      />
      <div style={{ marginTop: 12, display: "flex", gap: 12, alignItems: "center" }}>
        {sampleFiles.length > 0 ? (
          <>
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
          </>
        ) : null}
        <button className="btn" type="submit" disabled={loading || loadingFixture}>
          {loading ? "Uploading..." : "Open Build"}
        </button>
        <span className="meta">PoE1 only, read-only rendering, supports common PoB import URLs</span>
      </div>
      {error && (
        <div className="error-box" style={{ marginTop: 12 }}>
          {error}
        </div>
      )}
    </form>
  );
}
