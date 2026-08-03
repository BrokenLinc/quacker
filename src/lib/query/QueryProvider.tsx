import { defaultShouldDehydrateQuery } from '@tanstack/react-query';
import { PersistQueryClientProvider } from '@tanstack/react-query-persist-client';
import React from 'react';

import { isPersistedQueryKey } from '@@api/queryKeys';

import {
  PERSIST_BUSTER,
  PERSIST_MAX_AGE,
  createIdbPersister,
  queryClient,
} from './client';

/**
 * Cache provider. Restores rooms and messages from IndexedDB before the first
 * network round-trip so a cold start — including a notification tap — opens to
 * real content. Children render immediately; queries wait for the restore.
 */
export const QueryProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const persistOptions = React.useMemo(
    () => ({
      persister: createIdbPersister(),
      maxAge: PERSIST_MAX_AGE,
      buster: PERSIST_BUSTER,
      dehydrateOptions: {
        shouldDehydrateQuery: (query: Parameters<
          typeof defaultShouldDehydrateQuery
        >[0]) =>
          defaultShouldDehydrateQuery(query) &&
          isPersistedQueryKey(query.queryKey),
      },
    }),
    []
  );

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={persistOptions}
    >
      {children}
    </PersistQueryClientProvider>
  );
};
