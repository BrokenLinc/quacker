import * as UI from '@chakra-ui/react';
import {
  FontAwesomeIcon,
  FontAwesomeIconProps,
} from '@fortawesome/react-fontawesome';

export type IconProps = UI.BoxProps & FontAwesomeIconProps;

export const Icon = UI.chakra(FontAwesomeIcon);
