/** Stored in DB and used by swipe deck; must match `user_kink_preferences_value_check`. */
export type StoredPreferenceValue = number | null;

export const KINK_VALUE = {
  no: 0,
  maybe: 33,
  mood: 67,
  yes: 100,
} as const;

export type SwipeDirection = 'no' | 'yes' | 'mood' | 'probablyNot';

/** Maps swipe directions to stored values (same as home deck). */
export const SWIPE_VALUES: Record<SwipeDirection, number> = {
  no: KINK_VALUE.no,
  yes: KINK_VALUE.yes,
  mood: KINK_VALUE.mood,
  probablyNot: KINK_VALUE.maybe,
};

export const SWIPE_LABELS: Record<SwipeDirection, string> = {
  no: 'NO',
  yes: 'YES',
  mood: 'GET ME IN THE MOOD FIRST',
  probablyNot: 'MAYBE',
};

export function preferenceValueToShortLabel(value: StoredPreferenceValue): string {
  if (value === null) return 'Not set';
  switch (value) {
    case KINK_VALUE.no:
      return 'No';
    case KINK_VALUE.maybe:
      return 'Maybe';
    case KINK_VALUE.mood:
      return 'Mood';
    case KINK_VALUE.yes:
      return 'Yes';
    default:
      return `${value}`;
  }
}

export const EDIT_OPTIONS: { label: string; value: number }[] = [
  { label: 'No', value: KINK_VALUE.no },
  { label: 'Maybe', value: KINK_VALUE.maybe },
  { label: 'Get Me in the Mood First', value: KINK_VALUE.mood },
  { label: 'Yes', value: KINK_VALUE.yes },
];
