import * as UI from '@chakra-ui/react';
import { faCircleExclamation } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

export type AlertMessageProps = React.PropsWithChildren<UI.AlertProps>;

/**
 * A whole-form error message, typically used for post-back errors
 */
export const AlertMessage: React.FC<AlertMessageProps> = ({
  children,
  colorScheme = 'red',
  ...restProps
}) => {
  if (!children) return null;

  return (
    <UI.Alert colorScheme={colorScheme} borderRadius="lg" {...restProps}>
      <UI.HStack alignItems="start">
        <UI.Text color={`${colorScheme}.500`} fontSize="xl" lineHeight={6}>
          <FontAwesomeIcon icon={faCircleExclamation} />
        </UI.Text>
        <UI.AlertTitle>{children}</UI.AlertTitle>
      </UI.HStack>
    </UI.Alert>
  );
};
