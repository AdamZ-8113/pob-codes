import { isLocalHostname } from "./local-host";

const LOCAL_WORKER_API_BASE = "http://localhost:8787";
const PUBLIC_WORKER_API_BASE = "https://api.pob.codes";

export function getApiBase(): string {
  const configuredBase = process.env.NEXT_PUBLIC_API_BASE;
  if (configuredBase) {
    return normalizeApiBase(configuredBase);
  }

  // In local dev the worker runs on :8787 by default.
  if (process.env.NODE_ENV === "development") {
    return LOCAL_WORKER_API_BASE;
  }

  if (typeof window !== "undefined") {
    return inferBrowserApiBase(window.location);
  }

  return LOCAL_WORKER_API_BASE;
}

export function buildApiUrl(pathname: string, base = getApiBase()): string {
  const normalizedBase = normalizeApiBase(base);
  const normalizedPath = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return new URL(normalizedPath, `${normalizedBase}/`).toString();
}

export function normalizeApiBase(value: string): string {
  return String(value).trim().replace(/\/+$/, "");
}

function inferBrowserApiBase(location: Pick<Location, "origin" | "hostname">): string {
  const hostname = location.hostname.trim().toLowerCase();
  if (isLocalHostname(hostname)) {
    return LOCAL_WORKER_API_BASE;
  }

  if (hostname === "pob.codes" || hostname === "www.pob.codes" || hostname.endsWith(".pob.codes")) {
    return PUBLIC_WORKER_API_BASE;
  }

  return normalizeApiBase(location.origin);
}
