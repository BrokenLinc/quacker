import { useFrameNow } from '@@helpers/dateTimeHelpers';
import { formatDistanceToNow } from 'date-fns';

export type TimeLeftProps = {
  until?: Date | null;
  children: (props: {
    distance: string;
    timeIsUp: boolean;
  }) => React.ReactElement;
};

export const TimeLeft: React.FC<TimeLeftProps> = ({ until, children }) => {
  const now = useFrameNow();
  if (!until || until.getTime() < now) {
    return children({ timeIsUp: true, distance: 'never' });
  }
  const distance = formatDistanceToNow(until);
  return children({ timeIsUp: false, distance });
};
