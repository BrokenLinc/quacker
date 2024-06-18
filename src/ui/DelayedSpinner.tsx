import * as UI from '@@ui';
import React from 'react';

export const DelayedSpinner: React.FC<UI.BoxProps> = (props) => {
  const [showSpinner, setShowSpinner] = React.useState(false);

  React.useEffect(() => {
    const timeout = setTimeout(() => setShowSpinner(true), 500);

    return () => clearTimeout(timeout);
  }, []);

  return showSpinner ? (
    <UI.Box p={4} {...props}>
      <UI.Spinner />
    </UI.Box>
  ) : null;
};
