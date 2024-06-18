import * as UI from '@@ui';
import React from 'react';
import { ErrorBoundary as ErrorBoundaryBase } from 'react-error-boundary';

export const ErrorBoundary: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  return (
    <ErrorBoundaryBase
      fallbackRender={({ error, resetErrorBoundary }) => {
        return (
          <UI.VStack alignItems="start">
            <UI.AlertMessage>
              Sorry, something went wrong.{' '}
              {error.message ? (
                <UI.InfoTooltip label={error.message} color="red.300" />
              ) : null}
            </UI.AlertMessage>
            <UI.Button onClick={resetErrorBoundary} variant="outline" size="sm">
              Try again
            </UI.Button>
          </UI.VStack>
        );
      }}
    >
      {children}
    </ErrorBoundaryBase>
  );
};
