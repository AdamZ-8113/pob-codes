import { deflate, inflate, inflateRaw } from "pako";

export class BuildCodecError extends Error {
  constructor(
    message: string,
    public readonly code:
      | "INVALID_BASE64"
      | "INVALID_ZLIB"
      | "INVALID_XML"
      | "EMPTY_INPUT",
  ) {
    super(message);
    this.name = "BuildCodecError";
  }
}

export function decodeBuildCode(code: string): string {
  const trimmed = code.trim();
  if (!trimmed) {
    throw new BuildCodecError("Build code is empty", "EMPTY_INPUT");
  }

  const bytes = fromBase64Url(trimmed);
  const inflated = inflateWithFallback(bytes);
  const xml = new TextDecoder("utf-8").decode(inflated).trim();

  if (!(xml.startsWith("<?xml") || xml.startsWith("<PathOfBuilding"))) {
    throw new BuildCodecError("Decoded content is not a PoB XML payload", "INVALID_XML");
  }

  return xml;
}

export function encodeBuildCode(xml: string): string {
  const bytes = new TextEncoder().encode(xml);
  const compressed = deflate(bytes);
  return toBase64Url(compressed);
}

export function fromBase64Url(input: string): Uint8Array {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized + "=".repeat((4 - (normalized.length % 4)) % 4);

  try {
    if (typeof Buffer !== "undefined") {
      return Uint8Array.from(Buffer.from(padded, "base64"));
    }

    if (typeof atob !== "undefined") {
      const decoded = atob(padded);
      const out = new Uint8Array(decoded.length);
      for (let i = 0; i < decoded.length; i += 1) {
        out[i] = decoded.charCodeAt(i);
      }
      return out;
    }
  } catch {
    throw new BuildCodecError("Invalid base64 payload", "INVALID_BASE64");
  }

  throw new BuildCodecError("No base64 decoder available in this runtime", "INVALID_BASE64");
}

export function toBase64Url(input: Uint8Array): string {
  let b64: string;
  if (typeof Buffer !== "undefined") {
    b64 = Buffer.from(input).toString("base64");
  } else {
    let binary = "";
    for (const byte of input) {
      binary += String.fromCharCode(byte);
    }
    b64 = btoa(binary);
  }

  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function inflateWithFallback(bytes: Uint8Array): Uint8Array {
  try {
    return inflate(bytes);
  } catch {
    try {
      return inflateRaw(bytes);
    } catch {
      throw new BuildCodecError("Could not inflate build payload", "INVALID_ZLIB");
    }
  }
}
