import * as UI from '@chakra-ui/react';
import React from 'react';

/**
 * A button group that fits nicely in a form-grid
 */
export const FormButtonGroup: React.FC<UI.StackProps> = ({
  children,
  ...restProps
}) => {
  return (
    <UI.HStack gridColumn="1/-1" spacing={4} {...restProps}>
      {children}
    </UI.HStack>
  );
};
