/** Indian-grouped amount with two decimals. */
export const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

/** Compact amount for tiles and chart labels: 1.2 L, 3.4 Cr. */
export const fmtShort = (n: number) => {
  const a = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (a >= 1e7) return `${sign}${(a / 1e7).toFixed(2)} Cr`;
  if (a >= 1e5) return `${sign}${(a / 1e5).toFixed(2)} L`;
  if (a >= 1e3) return `${sign}${(a / 1e3).toFixed(1)} K`;
  return `${sign}${a.toFixed(0)}`;
};

export const pct = (part: number, whole: number) => (whole > 0 ? (part / whole) * 100 : 0);
