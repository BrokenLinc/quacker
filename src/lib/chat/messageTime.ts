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

/**
 * Live author name for message chrome. Prefer current display name; fall back
 * to "Someone" when empty. Phone last-4 lives on the member profile sheet, not
 * inline next to the name.
 */
export function formatAuthorLabel(
  displayName: string | null | undefined
): string {
  return displayName?.trim() || 'Someone';
}

/** Join date for member profile sheets (e.g. "Aug 23, 2024"). */
export function formatJoinedAt(
  timeMs: number,
  locale?: string
): string {
  return new Intl.DateTimeFormat(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(timeMs));
}
