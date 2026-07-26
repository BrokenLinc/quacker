import * as Chakra from '@chakra-ui/react';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import React from 'react';
import { Link } from 'react-router-dom';

import { useIsRouteOrChildActive } from '@@routing/helpers/useIsRouteOrChildActive';
import type { RouteDef } from '@@routing/types';

import { Icon } from './Icon';
import { QuickModal } from './QuickModal';

export type ActionSheetItem = {
  id: string;
  label: React.ReactNode;
  icon?: IconDefinition;
  onClick?: () => void;
  /** Navigate via react-router when set (closes sheet first). */
  route?: RouteDef;
  isDestructive?: boolean;
  isDisabled?: boolean;
};

export type ActionSheetProps = {
  isOpen: boolean;
  onClose: () => void;
  headerContent?: React.ReactNode;
  items: ActionSheetItem[];
  /** Optional content above the action list (e.g. identity header). */
  children?: React.ReactNode;
  /** Drawer edge on mobile (default: bottom). */
  mobilePlacement?: 'top' | 'bottom';
};

/**
 * Floating action sheet for mobile. Inset from screen edges with rounded
 * corners — use instead of Menu popovers for short lists on small screens.
 */
export const ActionSheet: React.FC<ActionSheetProps> = ({
  isOpen,
  onClose,
  headerContent,
  items,
  children,
  mobilePlacement = 'bottom',
}) => {
  return (
    <QuickModal
      isOpen={isOpen}
      onClose={onClose}
      headerContent={headerContent}
      size="md"
      mobilePlacement={mobilePlacement}
      floating
    >
      <Chakra.ModalBody px={0} pt={0} pb={2}>
        {children}
        <Chakra.VStack align="stretch" spacing={0}>
          {items.map((item) => (
            <ActionSheetRow key={item.id} item={item} onClose={onClose} />
          ))}
        </Chakra.VStack>
      </Chakra.ModalBody>
    </QuickModal>
  );
};

const ActionSheetRow: React.FC<{
  item: ActionSheetItem;
  onClose: () => void;
}> = ({ item, onClose }) => {
  const color = item.isDestructive ? 'red.500' : undefined;

  if (item.route) {
    return (
      <ActionSheetRouteRow item={item} onClose={onClose} color={color} />
    );
  }

  return (
    <Chakra.Button
      variant="ghost"
      justifyContent="flex-start"
      borderRadius={0}
      h="auto"
      py={3}
      px={4}
      fontWeight="normal"
      fontSize="sm"
      color={color}
      isDisabled={item.isDisabled}
      leftIcon={item.icon ? <Icon icon={item.icon} /> : undefined}
      // Framer-motion sheet drag steals taps without this.
      onPointerDown={(e) => e.stopPropagation()}
      onClick={() => {
        item.onClick?.();
        onClose();
      }}
    >
      {item.label}
    </Chakra.Button>
  );
};

const ActionSheetRouteRow: React.FC<{
  item: ActionSheetItem;
  onClose: () => void;
  color?: string;
}> = ({ item, onClose, color }) => {
  const route = item.route!;
  const isActive = useIsRouteOrChildActive(route);

  return (
    <Chakra.Button
      as={Link}
      to={route.path}
      variant="ghost"
      justifyContent="flex-start"
      borderRadius={0}
      h="auto"
      py={3}
      px={4}
      fontWeight={isActive ? 'bold' : 'normal'}
      fontSize="sm"
      color={color}
      bg={isActive ? 'nav.selected' : undefined}
      isDisabled={item.isDisabled}
      leftIcon={item.icon ? <Icon icon={item.icon} /> : undefined}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={onClose}
      textDecoration="none"
      _hover={{ textDecoration: 'none' }}
    >
      {item.label}
    </Chakra.Button>
  );
};
