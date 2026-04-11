/** Preference value from swipe (0–100 scale) or unset. */
export type PreferenceValue = number | null;

export function categoryCompatibility(a: number, b: number): number {
  const diff = Math.abs(a - b);
  return 100 - diff;
}

/**
 * Average per-kink compatibility across shared answered kinks, or null if none overlap.
 */
export function overallCompatibility(
  categories: readonly { id: number }[],
  aPrefs: Map<number, PreferenceValue>,
  bPrefs: Map<number, PreferenceValue>,
): number | null {
  let sum = 0;
  let comparableCount = 0;
  for (const kink of categories) {
    const a = aPrefs.get(kink.id);
    const b = bPrefs.get(kink.id);
    if (a == null || b == null) continue;
    sum += categoryCompatibility(a, b);
    comparableCount += 1;
  }
  if (comparableCount === 0) return null;
  return sum / comparableCount;
}
