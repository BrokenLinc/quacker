import * as UI from '@@ui';
import React from 'react';

const defaultIndicatorProps: UI.BadgeProps = {
  variant: 'block',
};

const defaultActiveProps: UI.BadgeProps = {
  ...defaultIndicatorProps,
  opacity: 1,
  colorScheme: 'purple',
};

const defaultInactiveProps: UI.BadgeProps = {
  ...defaultIndicatorProps,
  bg: 'purple.600',
  color: 'purple.300',
  // colorScheme: 'gray',
};

export type IndicatorBadgeProps = UI.BadgeProps & {
  active?: boolean | null;
  activeProps?: UI.BadgeProps;
  inactiveProps?: UI.BadgeProps;
};

export const IndicatorBadge: React.FC<IndicatorBadgeProps> = ({
  active,
  activeProps,
  inactiveProps,
  ...restProps
}) => {
  const props = active
    ? { ...defaultActiveProps, ...activeProps }
    : { ...defaultInactiveProps, ...inactiveProps };
  return <UI.Badge {...props} {...restProps} />;
};
