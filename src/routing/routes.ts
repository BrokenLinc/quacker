import * as Pages from '@@pages';

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
  groupBySlug: (slug = ':slug') => ({
    path: `/g/${slug}`,
    component: Pages.GroupSlugPage,
    label: 'Group',
  }),
  authCallback: () => ({
    path: '/auth/callback',
    component: Pages.AuthCallbackPage,
    label: 'Auth',
  }),
};
