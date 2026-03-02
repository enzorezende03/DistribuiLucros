/**
 * Returns a dynamic color (yellow → orange → red → purple) based on how much
 * a value exceeds the R$50,000 threshold, using percentage-based scale.
 *
 * Scale (based on % excess over 50,000):
 *   0–50%    (até R$75.000)   → yellow
 *   51–100%  (até R$100.000)  → orange
 *   101–200% (até R$150.000)  → red
 *   200%+                     → purple
 */

const LIMITE = 50000;

/** Returns excess percentage over R$50k (e.g. 62500 → 25) */
export function getExcessPercent(totalValue: number): number {
  if (totalValue <= LIMITE) return 0;
  return ((totalValue - LIMITE) / LIMITE) * 100;
}

export function getExcessColor(totalValue: number): string {
  const pct = getExcessPercent(totalValue);
  if (pct <= 0) return 'hsl(48, 96%, 53%)'; // yellow

  if (pct <= 50) {
    // yellow (gradient within yellow range)
    const t = pct / 50;
    const h = 48 - t * 6;    // 48 → 42
    const s = 96 - t * 2;    // 96 → 94
    const l = 53 - t * 3;    // 53 → 50
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  if (pct <= 100) {
    // orange
    const t = (pct - 50) / 50;
    const h = 30 - t * 5;    // 30 → 25
    const s = 92 - t * 4;    // 92 → 88
    const l = 48 - t * 3;    // 48 → 45
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  if (pct <= 200) {
    // red
    const t = (pct - 100) / 100;
    const h = 4 - t * 2;     // 4 → 2
    const s = 82 - t * 6;    // 82 → 76
    const l = 40 - t * 4;    // 40 → 36
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  // 200%+ → purple
  return 'hsl(280, 65%, 38%)';
}

/** Tailwind-friendly class that approximates the color scale */
export function getExcessColorClass(totalValue: number): string {
  const pct = getExcessPercent(totalValue);
  if (pct <= 0) return 'text-yellow-500';
  if (pct <= 50) return 'text-yellow-500';
  if (pct <= 100) return 'text-orange-500';
  if (pct <= 200) return 'text-red-600';
  return 'text-purple-700 dark:text-purple-400';
}
