import { Icon } from '@@/ui';
import * as UI from '@chakra-ui/react';
import { forwardRef } from '@chakra-ui/react';
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons';

export type AccordionItemProps = UI.AccordionItemProps & {
  title?: string;
  isExpanded: boolean;
};

export const AccordionItem = forwardRef<AccordionItemProps, 'div'>(
  ({ title, isExpanded, children, ...restProps }, ref) => {
    return (
      <UI.AccordionItem {...restProps} ref={ref}>
        {({ isExpanded }) => (
          <>
            <UI.AccordionButton>
              <UI.Box as="span" flex="1" textAlign="left">
                {title}
              </UI.Box>
              {isExpanded ? <Icon icon={faMinus} /> : <Icon icon={faPlus} />}
            </UI.AccordionButton>
            {children}
          </>
        )}
      </UI.AccordionItem>
    );
  }
);
