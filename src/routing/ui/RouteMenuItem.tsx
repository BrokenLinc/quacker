import { useIsRouteOrChildActive } from '@@routing/helpers/useIsRouteOrChildActive';
import { AppRoute } from '@@routing/types';
import * as UI from '@@ui';
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A link to a route.
 * The link will not render if the user doesn't have the required permission.
 */

export type RouteMenuItemProps = {
  route: AppRoute;
  activeProps?: UI.MenuItemProps;
  onActive?: () => void;
  activateOnChild?: boolean;
} & UI.MenuItemProps;
export const RouteMenuItem = React.forwardRef<
  HTMLAnchorElement,
  RouteMenuItemProps
>(({ route, activeProps, onActive, activateOnChild, ...restProps }, ref) => {
  const isActive = useIsRouteOrChildActive(route, activateOnChild);
  React.useEffect(() => {
    if (isActive) {
      onActive?.();
    }
  }, [isActive]);

  return (
    <UI.MenuItem
      ref={ref}
      as={Link}
      to={route.path}
      children={route.label}
      {...restProps}
      {...(isActive ? activeProps : {})}
    />
  );
});
