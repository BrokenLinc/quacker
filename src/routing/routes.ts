/** Path/label definitions only — no page imports (avoids lazy-load cycles). */
export const routes = {
  home: () => ({
    path: '/',
    label: 'Home',
  }),
  group: (groupId = ':groupId') => ({
    path: `/${groupId}`,
    label: 'Group',
  }),
  groupBySlug: (slug = ':slug') => ({
    path: `/g/${slug}`,
    label: 'Group',
  }),
  authCallback: () => ({
    path: '/auth/callback',
    label: 'Auth',
  }),
};
