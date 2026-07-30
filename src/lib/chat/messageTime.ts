/** Locale-aware clock time for message headers (e.g. "5:15pm"). */
export function formatMessageTime(
  timeMs: number,
  locale?: string
): string {
  const formatted = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(timeMs));
  // Collapse space before am/pm and lowercase for en-style 12h clocks.
  return formatted.replace(/\s+(am|pm)/gi, (_, period: string) =>
    period.toLowerCase()
  );
}

/** Local calendar day key (YYYY-MM-DD) for comparing message dates. */
export function localDayKey(timeMs: number): string {
  const d = new Date(timeMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function startOfLocalDay(timeMs: number): number {
  const d = new Date(timeMs);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * Day divider label: "Today", "Yesterday", or a long locale date
 * (e.g. "Sunday, August 23").
 */
export function formatMessageDayLabel(
  timeMs: number,
  nowMs = Date.now(),
  locale?: string
): string {
  const dayStart = startOfLocalDay(timeMs);
  const todayStart = startOfLocalDay(nowMs);
  const diffDays = Math.round((todayStart - dayStart) / MS_PER_DAY);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';

  return new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(timeMs));
}

const DEFAULT_PHONE_NAME = /^···\d{4}$/;

export type AuthorLabel = {
  name: string;
  /** Four digits to show muted in parentheses when the name is customized. */
  last4Suffix: string | null;
};

/**
 * Live author chrome: current display name, plus muted (last4) when the user
 * has customized away from the ···XXXX phone default.
 */
export function formatAuthorLabel(
  displayName: string | null | undefined,
  phoneLast4: string | null | undefined
): AuthorLabel {
  const trimmed = displayName?.trim() || '';
  const name = trimmed || 'Someone';
  if (!trimmed || !phoneLast4 || DEFAULT_PHONE_NAME.test(name)) {
    return { name, last4Suffix: null };
  }
  const defaultName = `···${phoneLast4}`;
  if (name === defaultName) {
    return { name, last4Suffix: null };
  }
  return { name, last4Suffix: phoneLast4 };
}
