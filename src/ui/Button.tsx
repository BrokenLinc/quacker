import * as UI from '@chakra-ui/react';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { Icon } from './Icon';

const BUTTON_PRESETS = {
  primary: {
    colorScheme: 'purple',
  },
  secondary: {
    colorScheme: 'purple',
    variant: 'outline',
  },
  subtle: {
    colorScheme: 'purple',
    variant: 'ghost',
    bg: 'purple.100',
    _hover: {
      bg: 'purple.200',
    },
  },
};
type ButtonPresetKey = keyof typeof BUTTON_PRESETS;

export type ButtonProps = UI.ButtonProps & {
  preset?: ButtonPresetKey;
  iconBefore?: IconDefinition;
  iconAfter?: IconDefinition;
};

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ preset, children, iconBefore, iconAfter, ...restProps }, ref) => {
    const spacing = restProps.size === 'sm' ? 1 : 2;
    const { isDisabled } = restProps;

    const presetProps = preset ? BUTTON_PRESETS[preset] : {};

    if (iconBefore || iconAfter) {
      return (
        <UI.Button
          ref={ref}
          {...presetProps}
          {...restProps}
          pointerEvents={isDisabled ? 'none' : undefined}
        >
          {iconBefore ? <Icon icon={iconBefore} mr={spacing} /> : null}
          {children}
          {iconAfter ? <Icon icon={iconAfter} ml={spacing} /> : null}
        </UI.Button>
      );
    }

    return (
      <UI.Button
        ref={ref}
        {...presetProps}
        pointerEvents={isDisabled ? 'none' : undefined}
        {...restProps}
      >
        {children}
      </UI.Button>
    );
  }
);
