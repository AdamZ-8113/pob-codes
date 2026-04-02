const PLAIN_NUMBER_PATTERN = /^-?\d+(?:\.\d+)?$/;

const integerFormatter = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

export function formatDisplayValue(value: string | number | boolean): string {
  if (typeof value === "boolean") {
    return value ? "True" : "False";
  }

  const raw = typeof value === "number" ? String(value) : String(value).trim();
  if (!PLAIN_NUMBER_PATTERN.test(raw)) {
    return raw;
  }

  const numeric = Number(raw);
  if (!Number.isFinite(numeric)) {
    return raw;
  }

  if (Number.isInteger(numeric)) {
    return integerFormatter.format(numeric);
  }

  const absolute = Math.abs(numeric);
  const maximumFractionDigits =
    absolute >= 10_000 ? 1 : absolute >= 100 ? 2 : absolute >= 1 ? 3 : absolute >= 0.01 ? 4 : 6;

  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits,
  }).format(numeric);
}
