import {
  Accordion as ChakraAccordion,
  type AccordionRootProps,
  type AccordionItemProps as ChakraAccordionItemProps,
  useAccordionContext as useChakraAccordionContext,
  useAccordionItemContext,
} from '@chakra-ui/react';
import React from 'react';
import { mapV2Props } from './props';

const AccordionItemIndexContext = React.createContext<number | null>(null);

export type AccordionProps = AccordionRootProps & {
  allowMultiple?: boolean;
  allowToggle?: boolean;
  defaultIndex?: number | number[];
  index?: number | number[];
  onChange?: (index: number | number[]) => void;
};

export const Accordion = ({
  allowMultiple,
  allowToggle,
  defaultIndex,
  index,
  onChange,
  children,
  ...rest
}: AccordionProps) => {
  const toValue = (value?: number | number[]) => {
    if (value === undefined) return undefined;
    return Array.isArray(value)
      ? value.map(String)
      : [String(value)];
  };

  let itemIndex = 0;
  const indexedChildren = React.Children.map(children, (child) =>
    React.isValidElement(child) ? (
      <AccordionItemIndexContext.Provider value={itemIndex++}>
        {child}
      </AccordionItemIndexContext.Provider>
    ) : (
      child
    )
  );

  return (
    <ChakraAccordion.Root
      multiple={allowMultiple}
      collapsible={allowToggle ?? true}
      defaultValue={toValue(defaultIndex)}
      value={toValue(index)}
      onValueChange={(details) => {
        if (!onChange) return;
        const values = details.value.map(Number);
        onChange(allowMultiple ? values : values[0] ?? -1);
      }}
      {...mapV2Props(rest)}
    >
      {indexedChildren}
    </ChakraAccordion.Root>
  );
};

export type AccordionItemProps = Omit<ChakraAccordionItemProps, 'value'> & {
  value?: string;
  children?:
    | React.ReactNode
    | ((context: { isExpanded: boolean }) => React.ReactNode);
};

let accordionItemCounter = 0;

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  function AccordionItem({ children, value, ...rest }, ref) {
    const itemIndex = React.useContext(AccordionItemIndexContext);
    const itemValue =
      itemIndex === null
        ? value ?? `accordion-item-${++accordionItemCounter}`
        : String(itemIndex);

    if (typeof children === 'function') {
      return (
        <ChakraAccordion.Item ref={ref} value={itemValue} {...mapV2Props(rest)}>
          <ChakraAccordion.ItemContext>
            {(context) => children({ isExpanded: context.expanded })}
          </ChakraAccordion.ItemContext>
        </ChakraAccordion.Item>
      );
    }

    return (
      <ChakraAccordion.Item ref={ref} value={itemValue} {...mapV2Props(rest)}>
        {children}
      </ChakraAccordion.Item>
    );
  }
);

export const AccordionButton = ChakraAccordion.ItemTrigger;
export const AccordionPanel = ({
  children,
  ...rest
}: React.ComponentProps<typeof ChakraAccordion.ItemBody>) => (
  <ChakraAccordion.ItemContent>
    <ChakraAccordion.ItemBody {...mapV2Props(rest)}>{children}</ChakraAccordion.ItemBody>
  </ChakraAccordion.ItemContent>
);
export const AccordionIcon = ChakraAccordion.ItemIndicator;

export function useAccordionContext() {
  const context = useChakraAccordionContext();
  const values = (context.value ?? []).map(Number);
  const isMultiple = (context as { multiple?: boolean }).multiple ?? false;
  return {
    ...context,
    index: isMultiple ? values : values[0] ?? -1,
    setIndex: (nextIndex: number | number[]) => {
      const nextValue = Array.isArray(nextIndex)
        ? nextIndex.map(String)
        : [String(nextIndex)];
      context.setValue(nextValue);
    },
  };
}

export { useAccordionItemContext };
