import { describe, expect, it } from 'vitest';

import { filterNotifyRecipients, shouldNotifyMember } from './shouldNotify';

const msg = (overrides?: Partial<{ authorId: string; isAnnouncement: boolean }>) => ({
  authorId: 'author',
  isAnnouncement: false,
  ...overrides,
});

describe('shouldNotifyMember', () => {
  it('skips the author', () => {
    expect(
      shouldNotifyMember(
        { userId: 'author', pushEnabled: true, notifyLevel: 'all' },
        msg()
      )
    ).toBe(false);
  });

  it('skips when global push is off', () => {
    expect(
      shouldNotifyMember(
        { userId: 'u1', pushEnabled: false, notifyLevel: 'all' },
        msg()
      )
    ).toBe(false);
  });

  it('skips notify_level none', () => {
    expect(
      shouldNotifyMember(
        { userId: 'u1', pushEnabled: true, notifyLevel: 'none' },
        msg()
      )
    ).toBe(false);
  });

  it('skips announcements-only for normal messages', () => {
    expect(
      shouldNotifyMember(
        { userId: 'u1', pushEnabled: true, notifyLevel: 'announcements' },
        msg({ isAnnouncement: false })
      )
    ).toBe(false);
  });

  it('allows announcements-only for flagged messages', () => {
    expect(
      shouldNotifyMember(
        { userId: 'u1', pushEnabled: true, notifyLevel: 'announcements' },
        msg({ isAnnouncement: true })
      )
    ).toBe(true);
  });

  it('allows all for normal messages', () => {
    expect(
      shouldNotifyMember(
        { userId: 'u1', pushEnabled: true, notifyLevel: 'all' },
        msg()
      )
    ).toBe(true);
  });
});

describe('filterNotifyRecipients', () => {
  it('returns only matching members', () => {
    const out = filterNotifyRecipients(
      [
        { userId: 'author', pushEnabled: true, notifyLevel: 'all' },
        { userId: 'a', pushEnabled: true, notifyLevel: 'all' },
        { userId: 'b', pushEnabled: true, notifyLevel: 'announcements' },
        { userId: 'c', pushEnabled: false, notifyLevel: 'all' },
        { userId: 'd', pushEnabled: true, notifyLevel: 'none' },
      ],
      msg({ isAnnouncement: false })
    );
    expect(out.map((m) => m.userId)).toEqual(['a']);
  });
});
