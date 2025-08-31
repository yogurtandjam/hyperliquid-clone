export const num = (v: unknown): number | undefined => {
  if (v == null) return undefined;
  const x =
    typeof v === "string" ? parseFloat(v) : typeof v === "number" ? v : NaN;
  return Number.isFinite(x) ? x : undefined;
};

export const ms = (x?: number) => (x ? new Date(x).toLocaleString() : "—");
