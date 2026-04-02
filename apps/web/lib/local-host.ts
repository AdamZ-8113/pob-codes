export function isLocalHostname(hostname: string | null | undefined) {
  if (!hostname) {
    return false;
  }

  const normalizedHost = hostname.trim().toLowerCase();
  let normalized = normalizedHost;

  if (normalizedHost.startsWith("[")) {
    const closingBracketIndex = normalizedHost.indexOf("]");
    normalized = closingBracketIndex >= 0 ? normalizedHost.slice(1, closingBracketIndex) : normalizedHost.slice(1);
  } else if ((normalizedHost.match(/:/g)?.length ?? 0) === 1) {
    normalized = normalizedHost.split(":")[0] ?? normalizedHost;
  }

  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "0.0.0.0";
}

export function getRequestHostname(request: Request) {
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwardedHost) {
    return forwardedHost;
  }

  const host = request.headers.get("host")?.trim();
  if (host) {
    return host;
  }

  try {
    return new URL(request.url).hostname;
  } catch {
    return null;
  }
}

export function isLocalRequest(request: Request) {
  return isLocalHostname(getRequestHostname(request));
}
