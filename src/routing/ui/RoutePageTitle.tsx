import * as UI from '@@ui';
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import React from 'react';

import { AppRoute } from '../types';

export const RoutePageTitle: React.FC<{ route: AppRoute } & UI.StackProps> = ({
  route,
  children,
  ...restProps
}) => {
  return (
    <UI.VStack alignItems="stretch" spacing={2} mb={10} {...restProps}>
      {route.parent ? (
        <UI.RouteLink route={route.parent} fontSize="sm" alignSelf="start">
          <FontAwesomeIcon icon={faArrowLeft} />
          <UI.Text as="span" ml={1}>
            {route.parent.label}
          </UI.Text>
        </UI.RouteLink>
      ) : null}
      <UI.HStack alignItems="start">
        <UI.DocumentTitle>{route.label}</UI.DocumentTitle>
        <UI.Heading mr="auto" size="xl">
          {route.label}
        </UI.Heading>
        {children}
      </UI.HStack>
    </UI.VStack>
  );
};
