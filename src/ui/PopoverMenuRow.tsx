import * as Chakra from '@chakra-ui/react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import React from 'react';

import { Icon } from './Icon';

export type PopoverMenuRowProps = {
  icon: IconDefinition;
  label: string;
  onClick: () => void;
  isDestructive?: boolean;
};

/**
 * Ghost action row with a fixed-width icon column so labels align across
 * mixed FontAwesome glyphs (use `fixedWidth` + slot).
 */
export const PopoverMenuRow: React.FC<PopoverMenuRowProps> = ({
  icon,
  label,
  onClick,
  isDestructive,
}) => (
  <Chakra.Button
    variant="ghost"
    justifyContent="flex-start"
    borderRadius={0}
    h="auto"
    py={2.5}
    px={4}
    fontWeight="normal"
    fontSize="sm"
    color={isDestructive ? 'red.500' : undefined}
    leftIcon={
      <Chakra.Box
        as="span"
        w={5}
        display="inline-flex"
        justifyContent="center"
        alignItems="center"
        flexShrink={0}
      >
        <Icon icon={icon} fixedWidth />
      </Chakra.Box>
    }
    onClick={onClick}
  >
    {label}
  </Chakra.Button>
);
