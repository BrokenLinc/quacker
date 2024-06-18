import * as UI from '@chakra-ui/react';
import React from 'react';

/**
 * A button that looks like a link
 */
export const LinkButton: React.FC<UI.ButtonProps> = ({
  children,
  ...restProps
}) => {
  return (
    <UI.Button variant="link" {...restProps}>
      {children}
    </UI.Button>
  );
};
