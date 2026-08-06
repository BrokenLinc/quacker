/** Path/label definitions only — no page imports (avoids lazy-load cycles). */
export const routes = {
  home: () => ({
    path: '/',
    label: 'Home',
  }),
  suggestions: () => ({
    path: '/suggestions',
    label: 'Suggestions',
    parent: routes.home(),
  }),
  suggestionsNew: () => ({
    path: '/suggestions/new',
    label: 'Make a suggestion',
    parent: routes.suggestions(),
  }),
  superadminSignIn: () => ({
    path: '/superadmin',
    label: 'SuperAdmin sign in',
  }),
  adminGroups: () => ({
    path: '/admin/groups',
    label: 'All groups',
    parent: routes.home(),
  }),
  adminUsers: () => ({
    path: '/admin/users',
    label: 'All users',
    parent: routes.home(),
  }),
  group: (groupId = ':groupId') => ({
    path: `/${groupId}`,
    label: 'Room',
  }),
  groupBySlug: (slug = ':slug') => ({
    path: `/g/${slug}`,
    label: 'Room',
  }),
};
