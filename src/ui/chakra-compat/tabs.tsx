import {
  Tabs as ChakraTabs,
  type TabsRootProps,
  type TabsTriggerProps,
  type TabsContentProps,
  useTabsContext as useChakraTabsContext,
} from '@chakra-ui/react';
import React from 'react';
import { mapV2Props } from './props';

const TabIndexContext = React.createContext(0);

export type TabsProps = Omit<TabsRootProps, 'variant'> & {
  defaultIndex?: number;
  index?: number;
  onChange?: (index: number) => void;
  isLazy?: boolean;
  variant?: TabsRootProps['variant'] | 'soft-rounded' | 'unstyled';
};

export const Tabs = ({
  defaultIndex,
  index,
  onChange,
  isLazy,
  variant,
  children,
  ...rest
}: TabsProps) => {
  const mapped = mapV2Props(rest);
  const resolvedVariant =
    variant === 'soft-rounded' ? 'enclosed' : variant === 'unstyled' ? 'plain' : variant;
  return (
    <ChakraTabs.Root
      defaultValue={
        defaultIndex !== undefined ? `tab-${defaultIndex}` : undefined
      }
      value={index !== undefined ? `tab-${index}` : undefined}
      lazyMount={isLazy}
      unmountOnExit={isLazy}
      onValueChange={(details) => {
        if (onChange && details.value) {
          onChange(Number(details.value.replace('tab-', '')));
        }
      }}
      {...mapped}
      variant={resolvedVariant}
    >
      {children}
    </ChakraTabs.Root>
  );
};

export const TabList = ({
  children,
  ...rest
}: React.ComponentProps<typeof ChakraTabs.List>) => (
  <ChakraTabs.List {...mapV2Props(rest)}>
    {React.Children.map(children, (child, index) =>
      React.isValidElement(child) ? (
        <TabIndexContext.Provider value={index}>{child}</TabIndexContext.Provider>
      ) : (
        child
      )
    )}
  </ChakraTabs.List>
);

export type TabProps = Omit<TabsTriggerProps, 'value'> & {
  value?: string;
};

export const Tab = ({ value, children, ...rest }: TabProps) => {
  const index = React.useContext(TabIndexContext);
  const tabValue = value ?? `tab-${index}`;
  return (
    <ChakraTabs.Trigger value={tabValue} {...mapV2Props(rest)}>
      {children}
    </ChakraTabs.Trigger>
  );
};

export const TabPanels = ({ children, ...rest }: React.ComponentProps<'div'>) => (
  <div {...rest}>
    {React.Children.map(children, (child, index) =>
      React.isValidElement(child) ? (
        <TabIndexContext.Provider value={index}>{child}</TabIndexContext.Provider>
      ) : (
        child
      )
    )}
  </div>
);

export type TabPanelProps = Omit<TabsContentProps, 'value'> & {
  value?: string;
};

export const TabPanel = ({ value, children, ...rest }: TabPanelProps) => {
  const index = React.useContext(TabIndexContext);
  const tabValue = value ?? `tab-${index}`;
  return (
    <ChakraTabs.Content value={tabValue} {...mapV2Props(rest)}>
      {children}
    </ChakraTabs.Content>
  );
};

export function useTabsContext() {
  const context = useChakraTabsContext();
  const tabValue = context.value ?? 'tab-0';
  const selected = tabValue.startsWith('tab-')
    ? Number(tabValue.replace('tab-', ''))
    : 0;
  return {
    ...context,
    selectedIndex: selected,
    setSelectedIndex: (index: number) => context.setValue(`tab-${index}`),
  };
}
