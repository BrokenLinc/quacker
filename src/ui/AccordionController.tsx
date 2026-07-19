import * as UI from '@@ui';
import _ from 'lodash';
import React from 'react';

/**
 * A render-props component that provides functions to open and close accordion items by index
 */
export type AccordionControllerProps = {
  children: (props: {
    openByIndex: (index: number) => void;
    closeByIndex: (index: number) => void;
  }) => React.ReactNode;
};
export const AccordionController: React.FC<AccordionControllerProps> = ({
  children,
}) => {
  const accordionContext = UI.useAccordionContext();
  const openByIndex = (index: number) => {
    accordionContext.setIndex(
      _.uniq([..._.flatten([accordionContext.index]), index])
    );
  };
  const closeByIndex = (index: number) => {
    accordionContext.setIndex(
      _.without(_.flatten([accordionContext.index]), index)
    );
  };
  return (
    <React.Fragment>
      {children({
        openByIndex,
        closeByIndex,
      })}
    </React.Fragment>
  );
};
