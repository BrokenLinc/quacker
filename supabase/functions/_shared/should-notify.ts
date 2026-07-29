/**
 * Pure recipient filter for Deno edge — keep in sync with
 * src/lib/notifications/shouldNotify.ts
 */

export type NotifyLevel = 'all' | 'announcements' | 'none';

export type NotifyCandidate = {
  userId: string;
  pushEnabled: boolean;
  notifyLevel: NotifyLevel;
};

export type MessageNotifyInput = {
  authorId: string;
  isAnnouncement: boolean;
};

export const shouldNotifyMember = (
  member: NotifyCandidate,
  message: MessageNotifyInput
): boolean => {
  if (member.userId === message.authorId) return false;
  if (!member.pushEnabled) return false;
  if (member.notifyLevel === 'none') return false;
  if (member.notifyLevel === 'announcements' && !message.isAnnouncement) {
    return false;
  }
  return true;
};
