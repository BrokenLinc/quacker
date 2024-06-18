import * as UI from '@@ui';
import _ from 'lodash';
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Promisable } from 'type-fest';
import { ConfirmationOptions, useConfirmation } from './confirmation';

/**
 * Provides a context for running an action flow via a custom hook.
 * An "action flow" consists of the following options:
 * - Confirmation modal
 * - Running the given sync or async function
 * - Showing a success or failure toast
 * - Redirecting to a route on success
 * Presets are offered for common use cases (eg. "delete")
 * Must be placed inside the Router context and ConfirmationProvider
 */

type ActionFlowOptions = {
  preset?: keyof typeof actionFlowPresets;
  confirmation?: ConfirmationOptions;
  successToast?: UI.UseToastOptions;
  failureToast?: UI.UseToastOptions;
  successRedirectRoute?: string;
  onSuccess?: (result: any) => any; // A proper generic is too complex for me right now.
};

type ActionFlowContextValue = (
  action: Promisable<any>,
  options: ActionFlowOptions
) => void;

const ActionFlowContext = React.createContext<ActionFlowContextValue>(() => {});

export const useActionFlow = () => React.useContext(ActionFlowContext);

export const ActionFlowProvider: React.FC<React.PropsWithChildren> = ({
  children,
}) => {
  const toast = UI.useToast();
  const navigate = useNavigate();
  const confirmation = useConfirmation();

  const start = async (
    action: Promisable<any>,
    _options: ActionFlowOptions
  ) => {
    // Merge options with default and preset
    const options = _options.preset
      ? _.merge(
          {},
          actionFlowPresets._default,
          actionFlowPresets[_options.preset],
          _options
        )
      : _options;

    const onActionComplete = async (result: any) => {
      // Interpret truthy values as a positive result
      // Display appropriate toast and redirect if needed
      if (result) {
        if (options?.successToast) {
          toast(options.successToast);
        }
        if (options?.successRedirectRoute) {
          navigate(options.successRedirectRoute);
        }
      } else {
        if (options?.failureToast) {
          toast(options.failureToast);
        }
      }
    };

    // Open confirmation modal if needed, otherwise run action
    if (options?.confirmation) {
      confirmation.open({
        ...options.confirmation,
        onConfirm: async () => {
          // If dialog was confirmed, run callback & action
          await options?.confirmation?.onConfirm?.();
          await onActionComplete(
            await (async () => {
              try {
                const result = await action?.();
                if (result) options?.onSuccess?.(result);
                return result;
              } catch (e) {
                if (options?.failureToast) {
                  toast(options.failureToast);
                }
                return false;
              }
            })()
          );
        },
        onCancel: async () => {
          // If dialog was cancelled, run callback
          await options?.confirmation?.onCancel?.();
        },
      });
    } else {
      onActionComplete(
        await (async () => {
          const result = await action();
          if (result) options?.onSuccess?.(result);
          return result;
        })()
      );
    }
  };

  return (
    <ActionFlowContext.Provider value={start}>
      {children}
    </ActionFlowContext.Provider>
  );
};

export const actionFlowPresets = {
  _default: {
    successToast: {
      title: 'Success',
      status: 'success',
    },
    failureToast: {
      title: 'Error',
      status: 'error',
    },
  },
  cancel: {
    confirmation: {
      message: 'Do you want to cancel this record?',
      confirmLabel: 'Yes, cancel it',
      cancelLabel: 'No, keep it',
    },
    successToast: {
      title: 'Record cancelled',
    },
    failureToast: {
      title: 'Error canceling record',
    },
  },
  clone: {
    confirmation: {
      message:
        'Do you want to clone this record, and select records attached to it?',
      confirmLabel: 'Yes, clone it',
      cancelLabel: 'Cancel',
    },
    successToast: {
      title: 'Record cloned',
    },
    failureToast: {
      title: 'Error cloning record',
    },
  },
  delete: {
    confirmation: {
      message: 'Do you want to delete this record?',
      confirmLabel: 'Yes, delete it',
      cancelLabel: 'Cancel',
    },
    successToast: {
      title: 'Record deleted',
    },
    failureToast: {
      title: 'Error deleting record',
    },
  },
  restore: {
    confirmation: {
      message: 'Do you want to restore this record?',
      confirmLabel: 'Yes, restore it',
      cancelLabel: 'Cancel',
    },
    successToast: {
      title: 'Record restored',
    },
    failureToast: {
      title: 'Error restoring record',
    },
  },
  uncancel: {
    confirmation: {
      message: 'Do you want to restore this record from cancellation?',
      confirmLabel: 'Yes, restore it',
      cancelLabel: 'No, leave it',
    },
    successToast: {
      title: 'Record restored',
    },
    failureToast: {
      title: 'Error restoring record',
    },
  },
};
