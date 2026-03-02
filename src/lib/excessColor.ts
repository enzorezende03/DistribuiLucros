/**
 * Returns a dynamic color (yellow → orange → red → purple) based on how much
 * a value exceeds the R$50,000 threshold.
 *
 * Scale (based on excess = value - 50000):
 *   0–10k   → yellow
 *   10k–30k → orange  
 *   30k–80k → red
 *   80k+    → purple
 */
export function getExcessColor(totalValue: number): string {
  const excess = totalValue - 50000;
  if (excess <= 0) return 'hsl(48, 96%, 53%)'; // yellow

  if (excess <= 10000) {
    // yellow → orange
    const t = excess / 10000;
    const h = 48 - t * 18;   // 48 → 30
    const s = 96 - t * 4;    // 96 → 92
    const l = 53 - t * 5;    // 53 → 48
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  if (excess <= 30000) {
    // orange → red
    const t = (excess - 10000) / 20000;
    const h = 30 - t * 26;   // 30 → 4
    const s = 92 - t * 10;   // 92 → 82
    const l = 48 - t * 8;    // 48 → 40
    return `hsl(${h}, ${s}%, ${l}%)`;
  }

  if (excess <= 80000) {
    // red → purple
    const t = (excess - 30000) / 50000;
    const h = 4 - t * 36 + 360; // 4 → 328 (wrap around)
    const s = 82 - t * 12;  // 82 → 70
    const l = 40 - t * 5;   // 40 → 35
    return `hsl(${h % 360}, ${s}%, ${l}%)`;
  }

  // 80k+ → deep purple
  return 'hsl(300, 65%, 32%)';
}

/** Tailwind-friendly class that approximates the color scale */
export function getExcessColorClass(totalValue: number): string {
  const excess = totalValue - 50000;
  if (excess <= 0) return 'text-yellow-500';
  if (excess <= 10000) return 'text-amber-500';
  if (excess <= 30000) return 'text-orange-600';
  if (excess <= 80000) return 'text-red-600';
  return 'text-purple-700 dark:text-purple-400';
}
