import type { NotifyLevel } from './shouldNotify';

export const notifyLevelLabel = (level: NotifyLevel): string => {
  switch (level) {
    case 'all':
      return 'All messages';
    case 'announcements':
      return 'Announcements only';
    case 'none':
      return 'None';
  }
};
