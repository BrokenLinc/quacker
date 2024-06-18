import * as UI from '@@ui';
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

export const InfoTooltip: React.FC<UI.TextProps & { label: string }> = ({
  label,
  children,
  ...restProps
}) => {
  return (
    <UI.Tooltip label={label}>
      <UI.Text color="purple.500" as="span" cursor="pointer" {...restProps}>
        <FontAwesomeIcon icon={faQuestionCircle} /> {children}
      </UI.Text>
    </UI.Tooltip>
  );
};
