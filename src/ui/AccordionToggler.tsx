import * as UI from '@chakra-ui/react';
import React from 'react';

/**
 * A component that consumes Chakra Accordion context,
 * and provides an expand-all/collapse-all button bar.
 */
export const AccordionToggler: React.FC<
  { itemCount: number } & UI.ButtonGroupProps
> = ({ itemCount, ...restProps }) => {
  const accordionContext = UI.useAccordionContext();
  const openItemCount =
    (Array.isArray(accordionContext.index)
      ? accordionContext.index.length
      : accordionContext.index) || 0;
  let allAreClosed = openItemCount === 0;
  let allAreOpen = openItemCount >= itemCount;

  const openAll = () => {
    accordionContext.setIndex(Array.from(Array(itemCount).keys()));
  };

  const closeAll = () => {
    accordionContext.setIndex([]);
  };

  return (
    <UI.ButtonGroup
      isAttached
      variant="outline"
      colorScheme="purple"
      bg="white"
      borderRadius="6"
      {...restProps}
    >
      <UI.Button
        flex="1 1 0"
        bg="white"
        onClick={openAll}
        isDisabled={allAreOpen}
      >
        Expand All
      </UI.Button>
      <UI.Button
        flex="1 1 0"
        bg="white"
        onClick={closeAll}
        isDisabled={allAreClosed}
      >
        Collapse All
      </UI.Button>
    </UI.ButtonGroup>
  );
};
