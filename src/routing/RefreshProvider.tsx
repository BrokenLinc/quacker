import * as UI from '@@ui';
import React from 'react';
/**
 * Context Provider to refresh the route
 * Pauses rendering children for 500ms to allow the route to refresh
 */

export const RefreshContext = React.createContext({
  isRefreshing: false,
  refresh: () => {},
});

export const RefreshProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const refreshTimeout = React.useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const [isRefreshing, setIsRefreshing] = React.useState(false);
  const refresh = React.useCallback(() => {
    setIsRefreshing(true);
    refreshTimeout.current = setTimeout(() => {
      setIsRefreshing(false);
    }, 500);
  }, []);

  React.useEffect(() => {
    return () => {
      clearTimeout(refreshTimeout.current);
    };
  }, []);

  return (
    <RefreshContext.Provider value={{ isRefreshing, refresh }}>
      {isRefreshing ? <UI.Spinner /> : children}
    </RefreshContext.Provider>
  );
};

export const useRefresh = () => {
  return React.useContext(RefreshContext).refresh;
};
