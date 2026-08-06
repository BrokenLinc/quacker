import { describe, expect, it } from 'vitest';

import type { Message } from './message';
import {
  MESSAGE_SYNC_OVERLAP_MS,
  deltaHasGap,
  deltaSinceMs,
  latestMessageTime,
  mergeMessages,
  sortMessages,
  trimMessages,
} from './messageSync';

const message = (id: string, time: number, text = id): Message => ({
  id,
  uid: 'u1',
  authorName: 'Ann',
  authorPhotoURL: null,
  time,
  text,
  groupId: 'g1',
  isAnnouncement: false,
  isAdminMessage: false,
});

describe('sortMessages', () => {
  it('orders oldest first', () => {
    const sorted = sortMessages([
      message('c', 300),
      message('a', 100),
      message('b', 200),
    ]);
    expect(sorted.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('breaks timestamp ties by id so ordering is stable', () => {
    const one = sortMessages([message('b', 100), message('a', 100)]);
    const two = sortMessages([message('a', 100), message('b', 100)]);
    expect(one.map((m) => m.id)).toEqual(['a', 'b']);
    expect(two.map((m) => m.id)).toEqual(one.map((m) => m.id));
  });

  it('does not mutate its input', () => {
    const input = [message('b', 200), message('a', 100)];
    sortMessages(input);
    expect(input.map((m) => m.id)).toEqual(['b', 'a']);
  });
});

describe('mergeMessages', () => {
  it('appends new rows in order', () => {
    const merged = mergeMessages(
      [message('a', 100), message('b', 200)],
      [message('c', 300)]
    );
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('dedupes by id and prefers the incoming row', () => {
    const merged = mergeMessages(
      [message('a', 100, 'stale')],
      [message('a', 100, 'fresh')]
    );
    expect(merged).toHaveLength(1);
    expect(merged[0].text).toBe('fresh');
  });

  it('reorders a row that arrives out of clock order', () => {
    const merged = mergeMessages(
      [message('a', 100), message('c', 300)],
      [message('b', 200)]
    );
    expect(merged.map((m) => m.id)).toEqual(['a', 'b', 'c']);
  });

  it('returns the existing list when there is nothing new', () => {
    const merged = mergeMessages([message('a', 100)], []);
    expect(merged.map((m) => m.id)).toEqual(['a']);
  });
});

describe('trimMessages', () => {
  it('keeps the newest messages', () => {
    const trimmed = trimMessages(
      [message('a', 100), message('b', 200), message('c', 300)],
      2
    );
    expect(trimmed.map((m) => m.id)).toEqual(['b', 'c']);
  });

  it('is a no-op below the cap', () => {
    const input = [message('a', 100)];
    expect(trimMessages(input, 5)).toBe(input);
  });
});

describe('latestMessageTime', () => {
  it('is null with nothing cached', () => {
    expect(latestMessageTime(undefined)).toBeNull();
    expect(latestMessageTime([])).toBeNull();
  });

  it('finds the newest timestamp regardless of order', () => {
    expect(
      latestMessageTime([message('c', 300), message('a', 100)])
    ).toBe(300);
  });
});

describe('deltaSinceMs', () => {
  it('is null with nothing cached, forcing a cold fetch', () => {
    expect(deltaSinceMs([])).toBeNull();
  });

  it('rewinds by the overlap window', () => {
    expect(deltaSinceMs([message('a', 10_000)])).toBe(
      10_000 - MESSAGE_SYNC_OVERLAP_MS
    );
  });
});

describe('deltaHasGap', () => {
  it('flags a full page as potentially incomplete', () => {
    expect(deltaHasGap(100, 100)).toBe(true);
  });

  it('accepts a partial page', () => {
    expect(deltaHasGap(3, 100)).toBe(false);
  });
});
