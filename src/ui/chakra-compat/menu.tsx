import {
  Menu as ChakraMenu,
  type MenuRootProps,
  type MenuItemProps as ChakraMenuItemProps,
} from '@chakra-ui/react';
import React from 'react';
import { mapV2Props } from './props';

export type MenuProps = MenuRootProps & { isLazy?: boolean };

export const Menu = ({ isLazy, children, ...rest }: MenuProps & { children?: React.ReactNode }) => (
  <ChakraMenu.Root lazyMount={isLazy} unmountOnExit={isLazy} {...mapV2Props(rest)}>
    {children}
  </ChakraMenu.Root>
);

type MenuButtonProps = {
  as?: React.ElementType;
  children?: React.ReactNode;
  [key: string]: unknown;
};

export const MenuButton = React.forwardRef<HTMLElement, MenuButtonProps>(
  function MenuButton({ as: Component, children, ...rest }, ref) {
    if (Component) {
      const AsComponent = Component as React.ElementType;
      return (
        <ChakraMenu.Trigger asChild>
          <AsComponent ref={ref} {...rest}>
            {children}
          </AsComponent>
        </ChakraMenu.Trigger>
      );
    }

    return (
      <ChakraMenu.Trigger ref={ref as React.Ref<HTMLButtonElement>} {...mapV2Props(rest)}>
        {children as React.ReactNode}
      </ChakraMenu.Trigger>
    );
  }
);

export const MenuList = ({
  children,
  ...rest
}: React.ComponentProps<typeof ChakraMenu.Content>) => (
  <ChakraMenu.Positioner>
    <ChakraMenu.Content {...mapV2Props(rest)}>{children}</ChakraMenu.Content>
  </ChakraMenu.Positioner>
);

let menuItemCounter = 0;

export type MenuItemProps = Omit<ChakraMenuItemProps, 'value'> & {
  value?: string;
  icon?: React.ReactNode;
  as?: React.ElementType;
  to?: string;
};

export const MenuItem = React.forwardRef<HTMLElement, MenuItemProps>(
  function MenuItem({ value, icon, children, as: Component, to, ...rest }, ref) {
    const itemValue = value ?? `menu-item-${++menuItemCounter}`;
    const mapped = mapV2Props(rest);

    if (Component) {
      const AsComponent = Component as React.ElementType;
      return (
        <ChakraMenu.Item asChild value={itemValue} {...mapped}>
          <AsComponent ref={ref} to={to}>
            {icon}
            {children}
          </AsComponent>
        </ChakraMenu.Item>
      );
    }

    return (
      <ChakraMenu.Item ref={ref as React.Ref<HTMLDivElement>} value={itemValue} {...mapped}>
        {icon}
        {children}
      </ChakraMenu.Item>
    );
  }
);
