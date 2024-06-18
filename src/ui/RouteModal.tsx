import { AppRoute } from '@@routing/types';
import * as UI from '@@ui';
import React from 'react';
import { useNavigate } from 'react-router';
import { useMatch } from 'react-router-dom';

/**
 * Renders a modal tied to a route
 * The modal will be open when the route is active.
 * The modal will be closed when the parent route is active.
 * @param route The route to watch for in order to display the modal
 * @param parentRoute The parent route to navigate to when closing the modal (fallback to route.parent)
 * @param children The children to render in the modal
 */

type RouteModalProps = Partial<Omit<UI.ModalProps, 'children'>> & {
  route: AppRoute;
  parentRoute?: AppRoute;
  children?: React.ReactNode | React.FC<{ onClose: () => void }>;
  header?: React.ReactNode;
  printable?: boolean;
};

export const RouteModal: React.FC<RouteModalProps> = ({
  route,
  parentRoute,
  children,
  header,
  printable,
  ...restProps
}) => {
  const isOpen = !!useMatch(route.path);

  const navigate = useNavigate();
  const onClose = () => {
    const path = parentRoute?.path || route.parent?.path;
    if (!path) {
      throw new Error(`RouteModal: No parent route in RouteModal`);
    }
    navigate(path);
  };

  return (
    <UI.Modal
      isOpen={isOpen}
      onClose={onClose}
      size="2xl"
      closeOnOverlayClick={false}
      {...restProps}
    >
      <UI.ModalOverlay />
      <UI.ModalContent>
        <UI.Box bg="white">
          <UI.ModalHeader>
            <UI.HStack
              alignItems="start"
              justifyContent="space-between"
              pr={10}
            >
              <UI.Box flex="1">{header || route.label}</UI.Box>
            </UI.HStack>
          </UI.ModalHeader>
          <UI.ModalCloseButton className="print-hidden" />
          <React.Suspense>
            <UI.ModalBody>
              {typeof children === 'function'
                ? children({ onClose })
                : children}
            </UI.ModalBody>
          </React.Suspense>
        </UI.Box>
      </UI.ModalContent>
    </UI.Modal>
  );
};
