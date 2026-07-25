import { forwardRef, IconButton as ChakraIconButton } from '@chakra-ui/react';
import type { IconButtonProps as ChakraIconButtonProps } from '@chakra-ui/react';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';

import { Icon } from './Icon';

export type IconButtonProps = Omit<ChakraIconButtonProps, 'icon'> & {
  icon: IconDefinition;
};

/**
 * Chakra IconButton that takes a FontAwesome `IconDefinition` directly —
 * same pattern as `Button` `iconBefore` / `iconAfter`. Uses Chakra's
 * `forwardRef` so polymorphic `as` (e.g. RouteLink) keeps working.
 */
export const IconButton = forwardRef<IconButtonProps, 'button'>(
  ({ icon, isDisabled, ...restProps }, ref) => {
    return (
      <ChakraIconButton
        ref={ref}
        icon={<Icon icon={icon} />}
        pointerEvents={isDisabled ? 'none' : undefined}
        isDisabled={isDisabled}
        {...restProps}
      />
    );
  }
);

IconButton.displayName = 'IconButton';
