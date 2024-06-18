import React from 'react';

// Store the title from index.html in memory.
const appName = document.title;

export const DocumentTitle: React.FC<{ children: string }> = ({
  children: title,
}) => {
  React.useEffect(() => {
    // Assign a new title based on the component content and the original title.
    document.title = `${title} - ${appName}`;

    // Fallback to the original title for pages that don't set the title
    return () => {
      document.title = appName;
    };
  }, [title]);

  return null;
};
