import {
  AccordionButton,
  AccordionItem as ChakraAccordionItem,
  Box,
  type AccordionItemProps as BaseAccordionItemProps,
} from './chakra-compat';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';
import React from 'react';
import { Icon } from './Icon';

export type AccordionItemProps = BaseAccordionItemProps & {
  title?: string;
  isExpanded?: boolean;
};

export const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  function AccordionItem({ title, children, ...restProps }, ref) {
    return (
      <ChakraAccordionItem {...restProps} ref={ref}>
        {
          (({ isExpanded }: { isExpanded: boolean }) => (
            <>
              <AccordionButton>
                <Box as="span" flex="1" textAlign="left">
                  {title}
                </Box>
                {isExpanded ? <Icon icon={faMinus} /> : <Icon icon={faPlus} />}
              </AccordionButton>
              {children}
            </>
          )) as unknown as React.ReactNode
        }
      </ChakraAccordionItem>
    );
  }
);
