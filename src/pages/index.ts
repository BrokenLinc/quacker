import React from 'react';

/**
 * This file is used to lazy load all of the pages in the application.
 * It's centralized to avoid redefining the same page, causing a remount.
 */

export const HomePage = React.lazy(() => import('./HomePage'));
export const GroupPage = React.lazy(() => import('./GroupPage'));
