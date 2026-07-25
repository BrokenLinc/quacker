import * as UI from '@chakra-ui/react';
import { IconDefinition } from '@fortawesome/free-solid-svg-icons';
import React from 'react';

import { Icon } from './Icon';

/**
 * Shared empty/error views — screens must never render blank.
 * See .cursor/rules/ux-standards.mdc.
 */

export type EmptyStateProps = UI.BoxProps & {
  icon?: IconDefinition;
  title: string;
  description?: string;
  action?: React.ReactNode;
};

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  action,
  ...boxProps
}) => {
  return (
    <UI.VStack
      spacing={3}
      py={12}
      px={6}
      textAlign="center"
      data-testid="empty-state"
      {...boxProps}
    >
      {icon ? (
        <UI.Circle size={12} bg="surface.sunken">
          <Icon icon={icon} color="text.muted" boxSize={5} />
        </UI.Circle>
      ) : null}
      <UI.Heading size="sm">{title}</UI.Heading>
      {description ? (
        <UI.Text fontSize="sm" color="text.muted" maxW="280px">
          {description}
        </UI.Text>
      ) : null}
      {action ? <UI.Box pt={2}>{action}</UI.Box> : null}
    </UI.VStack>
  );
};

export type ErrorStateProps = UI.BoxProps & {
  title?: string;
  description?: string;
  onRetry?: () => void;
};

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Something went wrong',
  description = 'Check your connection and try again.',
  onRetry,
  ...boxProps
}) => {
  return (
    <UI.VStack
      spacing={3}
      py={10}
      px={6}
      textAlign="center"
      data-testid="error-state"
      {...boxProps}
    >
      <UI.Heading size="sm">{title}</UI.Heading>
      <UI.Text fontSize="sm" color="text.muted" maxW="280px">
        {description}
      </UI.Text>
      {onRetry ? (
        <UI.Button size="sm" variant="outline" onClick={onRetry}>
          Try again
        </UI.Button>
      ) : null}
    </UI.VStack>
  );
};
