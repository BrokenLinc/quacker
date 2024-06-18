import * as UI from '@chakra-ui/react';
import { faExclamationCircle } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

/* Renders a more styled form error, with persistent height to mitigate layout shift */
export const FormFieldErrorMessage: React.FC<UI.BoxProps> = ({
  children,
  ...restProps
}) => {
  return (
    <UI.Box minH={5} mt={1} {...restProps}>
      <UI.FormErrorMessage mt={0}>
        <UI.HStack spacing={1} alignItems="start">
          <UI.Text lineHeight={4}>
            <FontAwesomeIcon icon={faExclamationCircle} />
          </UI.Text>
          <UI.Text>{children}</UI.Text>
        </UI.HStack>
      </UI.FormErrorMessage>
    </UI.Box>
  );
};
