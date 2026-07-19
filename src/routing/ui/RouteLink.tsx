import { useIsRouteOrChildActive } from '@@routing/helpers/useIsRouteOrChildActive';
import { RouteDef } from '@@routing/types';
import * as UI from '@@ui';
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A link to a route.
 * The link will not render if the user doesn't have the required permission.
 */

export type RouteLinkProps = {
  route: RouteDef;
  activeProps?: UI.LinkProps;
  onActive?: () => void;
  activateOnChild?: boolean;
} & UI.LinkProps;
export const RouteLink = React.forwardRef<HTMLAnchorElement, RouteLinkProps>(
  (
    { route, activeProps, onActive, activateOnChild, children, ...restProps },
    ref
  ) => {
    const isActive = useIsRouteOrChildActive(route, activateOnChild);
    React.useEffect(() => {
      if (isActive) {
        onActive?.();
      }
    }, [isActive]);

    return (
      <UI.Link asChild {...restProps} {...(isActive ? activeProps : {})}>
        <Link to={route.path} ref={ref}>
          {children ?? route.label}
        </Link>
      </UI.Link>
    );
  }
);
