const LOCAL_WORKER_API_BASE = "http://localhost:8787";

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
    return normalizeApiBase(window.location.origin);
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
