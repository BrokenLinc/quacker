/**************************************************************
 * Centralized route definitions
 *
 * All the application routes should be defined here,
 * and then imported for usage in the router, links, menus, etc.
 **************************************************************/

import * as Pages from '@@pages';

/**
 * Root routes should have no paths prefix,
 * and should load pages from the /pages directory.
 */
export const routes = {
  home: () => ({
    path: '/',
    component: Pages.HomePage,
    label: 'Home',
  }),
  group: (groupId = ':groupId') => ({
    path: `/${groupId}`,
    component: Pages.GroupPage,
    label: 'Group',
  }),
};
