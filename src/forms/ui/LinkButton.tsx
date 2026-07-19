import * as UI from '@@ui';
import React from 'react';

/**
 * A button that looks like a link
 */
export const LinkButton: React.FC<UI.ButtonProps> = ({
  children,
  ...restProps
}) => {
  return (
    <UI.Button variant="plain" {...restProps}>
      {children}
    </UI.Button>
  );
};
