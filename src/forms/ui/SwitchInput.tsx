import * as UI from '@chakra-ui/react';
import React from 'react';

/**
 * A switch input with label
 */
export type SwitchInputProps = { label?: string } & UI.SwitchProps;
export const SwitchInput = React.forwardRef<HTMLInputElement, SwitchInputProps>(
  ({ label, ...restProps }, ref) => {
    return (
      <UI.HStack spacing={3} alignItems="start" py={2}>
        <UI.Switch
          ref={ref}
          my="1px"
          colorScheme={restProps.isReadOnly ? 'purple' : undefined}
          {...restProps}
        />
        {label ? (
          <UI.FormLabel cursor="pointer" fontWeight="normal" fontSize="sm">
            {label}
          </UI.FormLabel>
        ) : null}
      </UI.HStack>
    );
  }
);
