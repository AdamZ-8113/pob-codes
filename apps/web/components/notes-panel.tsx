import React from "react";

import type { BuildPayload } from "@pobcodes/shared-types";

import { renderPobNotes } from "../lib/pob-notes";

interface NotesPanelProps {
  payload: BuildPayload;
}

export function NotesPanel({ payload }: NotesPanelProps) {
  const hasNotes = payload.notes.trim().length > 0;
  const lines = renderPobNotes(payload.notes);

  return (
    <section className="panel notes-panel">
      <div className="panel-toolbar">
        <h2>Notes</h2>
      </div>

      {hasNotes ? (
        <div className="notes-content" aria-label="Build notes">
          {lines.map((line, lineIndex) => (
            <div className="notes-line" key={`notes-line:${lineIndex}`}>
              {line.segments.length > 0 ? (
                line.segments.map((segment, segmentIndex) => (
                  <React.Fragment key={`notes-segment:${lineIndex}:${segmentIndex}`}>
                    {renderNotesSegment(segment.text, segment.color)}
                  </React.Fragment>
                ))
              ) : (
                <span className="notes-line-break" aria-hidden="true">
                  {"\u00a0"}
                </span>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="meta">No notes exported.</div>
      )}
    </section>
  );
}

const NOTES_URL_PATTERN = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/g;
const NOTES_TRAILING_PUNCTUATION = /[.,!?;:)\]]+$/;

function renderNotesSegment(text: string, color: string) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;

  for (const match of text.matchAll(NOTES_URL_PATTERN)) {
    const start = match.index ?? 0;
    const rawUrl = match[0];
    if (start > cursor) {
      nodes.push(
        <span className="notes-segment" key={`text:${cursor}`} style={{ color }}>
          {text.slice(cursor, start)}
        </span>,
      );
    }

    const { suffix, urlText } = splitTrailingPunctuation(rawUrl);
    nodes.push(
      <a
        className="notes-link"
        href={normalizeNotesUrl(urlText)}
        key={`link:${start}`}
        rel="noreferrer noopener"
        style={{ color }}
        target="_blank"
      >
        {urlText}
      </a>,
    );

    if (suffix) {
      nodes.push(
        <span className="notes-segment" key={`suffix:${start}`} style={{ color }}>
          {suffix}
        </span>,
      );
    }

    cursor = start + rawUrl.length;
  }

  if (cursor < text.length) {
    nodes.push(
      <span className="notes-segment" key={`text:${cursor}`} style={{ color }}>
        {text.slice(cursor)}
      </span>,
    );
  }

  return nodes;
}

function normalizeNotesUrl(url: string) {
  return url.startsWith("www.") ? `https://${url}` : url;
}

function splitTrailingPunctuation(url: string) {
  const suffix = url.match(NOTES_TRAILING_PUNCTUATION)?.[0] ?? "";
  if (!suffix) {
    return { suffix: "", urlText: url };
  }

  return {
    suffix,
    urlText: url.slice(0, -suffix.length),
  };
}
