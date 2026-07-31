import * as UI from '@@ui';
import React from 'react';

/**
 * Provides a context for opening a confirmation dialog via a custom hook.
 * Must be placed inside the ThemeProvider.
 * Uses QuickModal (same shell as other large dialogs; X close control).
 */

export type ConfirmationOptions = {
  title?: string;
  message?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** Destructive actions get a red confirm button. */
  isDestructive?: boolean;
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
      <UI.QuickModal
        {...modal}
        size="sm"
        isCentered
        headerContent={options?.title || 'Are you sure?'}
      >
        {options?.message ? (
          <UI.ModalBody textAlign="center">{options.message}</UI.ModalBody>
        ) : null}
        <UI.ModalFooter
          justifyContent="center"
          pb="calc(1rem + env(safe-area-inset-bottom, 0px))"
        >
          <UI.ButtonGroup isDisabled={running}>
            <UI.Button variant="ghost" onClick={modal.onClose}>
              {options?.cancelLabel || 'Cancel'}
            </UI.Button>
            <UI.Button
              colorScheme={options?.isDestructive ? 'red' : 'action'}
              onClick={onConfirm}
              isLoading={running}
            >
              {options?.confirmLabel || 'Confirm'}
            </UI.Button>
          </UI.ButtonGroup>
        </UI.ModalFooter>
      </UI.QuickModal>
    </ConfirmationContext.Provider>
  );
};
