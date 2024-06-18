import * as UI from '@@ui';
import _ from 'lodash';
import React from 'react';

export type InvisibleCheckboxProps = UI.CheckboxProps & {
  colorScheme?: string;
  sx?: any;
};

export const InvisibleCheckbox: React.FC<InvisibleCheckboxProps> = ({
  colorScheme = 'blue',
  sx,
  ...restProps
}) => {
  const badgeColor = UI.useToken('colors', `${colorScheme}.400`);

  return (
    <UI.Checkbox
      size="lg"
      borderRadius="md"
      border="none"
      colorScheme={colorScheme}
      color={`${colorScheme}.400`}
      fontFamily="heading"
      p="0"
      cursor="pointer"
      alignItems="start"
      {...restProps}
      sx={_.merge(
        {
          transition: 'all 0.2s',
          '&:after': {
            content: '""',
            display: 'block',
            // bg: 'red',
          },
          '.chakra-checkbox__label': {
            position: 'relative',
            color: `${colorScheme}.400`,
            margin: 0,
            zIndex: 1,
          },
          '.chakra-checkbox__control': {
            border: 0,
            padding: 0,
            position: 'absolute',
            top: 0,
            bottom: 0,
            left: 0,
            right: 0,
            width: '100%',
            height: '100%',
            whiteSpace: 'nowrap',
            zIndex: 2,
          },
          _hover: {
            '.chakra-checkbox__control': {
              bg: `${badgeColor}66` /* 40% opacity */,
            },
          },
          _focus: {},
          _checked: {
            '.chakra-checkbox__control': {
              bg: `${badgeColor}CC` /* 80% opacity */,
            },

            _hover: {
              '.chakra-checkbox__control': {
                bg: `${badgeColor}99` /* 60% opacity */,
              },
            },
          },
        },
        sx
      )}
    />
  );
};
