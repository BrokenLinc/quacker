import React from 'react';

import { setPageLabel } from '@@lib/notifications/documentChrome';

export const DocumentTitle: React.FC<{ children: string }> = ({
  children: title,
}) => {
  React.useEffect(() => {
    setPageLabel(title);
    return () => {
      setPageLabel(null);
    };
  }, [title]);

  return null;
};
