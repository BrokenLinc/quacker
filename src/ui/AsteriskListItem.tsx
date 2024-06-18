import * as UI from '@@ui';
import { faAsterisk } from '@fortawesome/free-solid-svg-icons';

export const AsteriskListItem: React.FC<UI.ListItemProps> = ({
  children,
  ...props
}) => {
  return (
    <UI.ListItem pl={5} position="relative" {...props}>
      <UI.ListIcon
        as={UI.Icon}
        icon={faAsterisk}
        color="purple.500"
        position="absolute"
        left={0}
        top={1}
      />
      {children}
    </UI.ListItem>
  );
};
