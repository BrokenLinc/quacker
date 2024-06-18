import { useIsRouteOrChildActive } from '@@routing/helpers/useIsRouteOrChildActive';
import { AppRoute } from '@@routing/types';
import * as UI from '@@ui';
import React from 'react';
import { Link } from 'react-router-dom';

/**
 * A button that links to a route.
 * The button will not render if the user doesn't have the required permission.
 */

export type RouteButtonProps = {
  route: AppRoute;
  activeProps?: UI.ButtonProps;
  onActive?: () => void;
  activateOnChild?: boolean;
  target?: string;
} & UI.ButtonProps;
export const RouteButton = React.forwardRef<
  HTMLButtonElement,
  RouteButtonProps
>(({ route, activeProps, onActive, activateOnChild, ...restProps }, ref) => {
  const isActive = useIsRouteOrChildActive(route, activateOnChild);
  React.useEffect(() => {
    if (isActive) {
      onActive?.();
    }
  }, [isActive]);

  return (
    <UI.Button
      ref={ref}
      as={Link}
      // @ts-ignore TODO: figure out why the custom button breaks this
      to={route.path}
      children={route.label}
      {...restProps}
      {...(isActive ? activeProps : {})}
    />
  );
});
