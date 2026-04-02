export interface PobNoteSegment {
  color: string;
  text: string;
}

export interface PobNoteLine {
  segments: PobNoteSegment[];
}

const DEFAULT_POB_NOTE_COLOR = "#c8c8c8";

const POB_NOTE_DIGIT_COLORS: Record<string, string> = {
  "0": "#000000",
  "1": "#dd0022",
  "2": "#33ff77",
  "3": "#88ffff",
  "4": "#ffff77",
  "5": "#8888ff",
  "6": "#d02090",
  "7": DEFAULT_POB_NOTE_COLOR,
  "8": "#7f7f7f",
  "9": "#ff9922",
};

const POB_NOTE_COLOR_PATTERN = /\^x([0-9A-Fa-f]{6})|\^([0-9])/g;

export function renderPobNotes(text: string): PobNoteLine[] {
  const lines: PobNoteLine[] = [{ segments: [] }];
  let currentColor = DEFAULT_POB_NOTE_COLOR;
  let cursor = 0;

  for (const match of text.matchAll(POB_NOTE_COLOR_PATTERN)) {
    const matchIndex = match.index ?? 0;
    if (matchIndex > cursor) {
      appendNoteChunk(lines, text.slice(cursor, matchIndex), currentColor);
    }

    currentColor = resolvePobNoteColor(match[0]) ?? currentColor;
    cursor = matchIndex + match[0].length;
  }

  if (cursor < text.length) {
    appendNoteChunk(lines, text.slice(cursor), currentColor);
  }

  return lines;
}

function appendNoteChunk(lines: PobNoteLine[], chunk: string, color: string) {
  const parts = chunk.split(/\r?\n/);

  for (let index = 0; index < parts.length; index += 1) {
    const part = parts[index];
    const currentLine = lines[lines.length - 1];

    if (part.length > 0) {
      const previousSegment = currentLine.segments[currentLine.segments.length - 1];
      if (previousSegment?.color === color) {
        previousSegment.text += part;
      } else {
        currentLine.segments.push({ color, text: part });
      }
    }

    if (index < parts.length - 1) {
      lines.push({ segments: [] });
    }
  }
}

function resolvePobNoteColor(token: string): string | undefined {
  if (token.startsWith("^x") && token.length === 8) {
    return `#${token.slice(2)}`;
  }

  if (token.startsWith("^") && token.length === 2) {
    return POB_NOTE_DIGIT_COLORS[token.slice(1)];
  }

  return undefined;
}
