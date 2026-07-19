import * as UI from '@@ui';
import {
  FontAwesomeIcon,
  FontAwesomeIconProps,
} from '@fortawesome/react-fontawesome';

export type IconProps = UI.BoxProps & FontAwesomeIconProps;

export const Icon = UI.chakra(FontAwesomeIcon);
