/** Shared rules for whether a member should receive a push for a message. */

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

/** Pure recipient filter — keep in sync with notify-new-message edge function. */
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

export const filterNotifyRecipients = (
  members: NotifyCandidate[],
  message: MessageNotifyInput
): NotifyCandidate[] => members.filter((m) => shouldNotifyMember(m, message));
