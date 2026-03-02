/**
 * Returns a dynamic color (yellow → orange → red → purple) based on how much
 * a value exceeds the R$50,000 threshold, using percentage-based scale.
 *
 * Scale (based on % excess over 50,000):
 *   0–25%   (até R$62.500)   → yellow
 *   25–50%  (até R$75.000)   → orange
 *   50–100% (até R$100.000)  → red
 *   100–200% (até R$150.000) → purple
 *   200%+                    → deep purple
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

  if (pct <= 25) {
    // yellow → orange
    const t = pct / 25;
    const h = 48 - t * 18;   // 48 → 30
    const s = 96 - t * 4;    // 96 → 92
    const l = 53 - t * 5;    // 53 → 48
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  if (pct <= 50) {
    // orange → red
    const t = (pct - 25) / 25;
    const h = 30 - t * 26;   // 30 → 4
    const s = 92 - t * 10;   // 92 → 82
    const l = 48 - t * 8;    // 48 → 40
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  if (pct <= 100) {
    // red → light purple
    const t = (pct - 50) / 50;
    const h = 4 - t * 36 + 360; // 4 → 328 (wrap)
    const s = 82 - t * 12;  // 82 → 70
    const l = 40 - t * 5;   // 40 → 35
    return `hsl(${h % 360}, ${s}%, ${l}%)`;
  }

  if (pct <= 200) {
    // purple → deep purple
    const t = (pct - 100) / 100;
    const h = 328 - t * 28;  // 328 → 300
    const s = 70 - t * 5;    // 70 → 65
    const l = 35 - t * 3;    // 35 → 32
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  // 200%+ → deep purple
  return 'hsl(300, 65%, 32%)';
}

/** Tailwind-friendly class that approximates the color scale */
export function getExcessColorClass(totalValue: number): string {
  const pct = getExcessPercent(totalValue);
  if (pct <= 0) return 'text-yellow-500';
  if (pct <= 25) return 'text-amber-500';
  if (pct <= 50) return 'text-orange-600';
  if (pct <= 100) return 'text-red-600';
  return 'text-purple-700 dark:text-purple-400';
}
