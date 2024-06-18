import * as UI from '@chakra-ui/react';
import React from 'react';
import { useMeasure } from 'react-use';

/* Context primarily for accessing column count from cells */
const FormGridContext = React.createContext<
  FormGridProps & { columns?: number }
>({});
export const useFormGridContext = () => React.useContext(FormGridContext);

/* Renders a simple-grid with children */
export type FormGridProps = { maxColumns?: 1 | 2 | 4 } & Omit<
  UI.SimpleGridProps,
  'columns'
>;
export const FormGrid: React.FC<FormGridProps> = ({
  maxColumns = 4,
  ...restProps
}) => {
  const [measureRef, { width }] = useMeasure<HTMLDivElement>();

  // Each column is the "small" field size
  let columns = 1;
  if (width >= 260) {
    columns = 2;
  }
  if (width >= 260 * 2 && maxColumns >= 2) {
    columns = 4;
  }
  if (width >= 260 * 4 && maxColumns >= 4) {
    columns = 8;
  }

  const gridProps = {
    ref: measureRef,
    columns,
    spacingX: 4,
    spacingY: 2,
    maxW: `${260 * maxColumns}px`,
    ...restProps,
  };

  // Don't render contents until we have a width
  if (!width) {
    return (
      <div ref={measureRef}>
        <UI.Spinner />
      </div>
    );
  }

  return (
    <FormGridContext.Provider value={gridProps}>
      <UI.SimpleGrid {...gridProps} />
    </FormGridContext.Provider>
  );
};
