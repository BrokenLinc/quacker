import * as UI from '@@ui';
import React from 'react';

/**
 * Provides a context for opening a confirmation dialog via a custom hook.
 * Must be placed inside the ThemeProvider
 */

export type ConfirmationOptions = {
  title?: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => any;
  onCancel?: () => any;
};

type ConfirmationContextValue = {
  open: (options: ConfirmationOptions) => void;
};

const ConfirmationContext = React.createContext({} as ConfirmationContextValue);

export const useConfirmation = () => React.useContext(ConfirmationContext);

export const ConfirmationProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const [options, setOptions] = React.useState<ConfirmationOptions>();
  const modal = UI.useDisclosure({
    onClose: () => {
      setRunning(false);
      options?.onCancel?.();
    },
  });
  const [running, setRunning] = React.useState(false);

  const open = (options: ConfirmationOptions) => {
    setOptions(options);
    modal.onOpen();
  };

  const onConfirm = async () => {
    setRunning(true);
    await options?.onConfirm?.();
    modal.onClose();
  };

  return (
    <ConfirmationContext.Provider value={{ open }}>
      {children}
      <UI.Modal {...modal}>
        <UI.ModalOverlay />
        <UI.ModalContent textAlign="center">
          <UI.ModalHeader>{options?.title || 'Are you sure?'}</UI.ModalHeader>

          {options?.message ? (
            <UI.ModalBody>{options.message}</UI.ModalBody>
          ) : null}
          <UI.ModalFooter justifyContent="center">
            <UI.ButtonGroup isDisabled={running}>
              {options?.onCancel ? (
                <UI.Button onClick={modal.onClose}>
                  {options?.cancelLabel || 'Cancel'}
                </UI.Button>
              ) : null}
              <UI.Button colorScheme="purple" onClick={onConfirm}>
                {options?.confirmLabel || 'Confirm'}
              </UI.Button>
            </UI.ButtonGroup>
          </UI.ModalFooter>
        </UI.ModalContent>
      </UI.Modal>
    </ConfirmationContext.Provider>
  );
};
