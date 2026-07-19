import {
  Dialog,
  type DialogRootProps,
  type DialogContentProps,
  type DialogHeaderProps,
  type DialogBodyProps,
  type DialogFooterProps,
} from '@chakra-ui/react';
import React from 'react';
import { mapV2Props } from './props';

type ModalRootProps = DialogRootProps & {
  isOpen?: boolean;
  onClose?: () => void;
  isCentered?: boolean;
  closeOnOverlayClick?: boolean;
  closeOnEsc?: boolean;
  blockScrollOnMount?: boolean;
};

export const Modal = ({
  isOpen,
  open,
  onClose,
  isCentered,
  closeOnOverlayClick = true,
  closeOnEsc = true,
  blockScrollOnMount,
  children,
  ...rest
}: ModalRootProps) => {
  const mapped = mapV2Props(rest);
  const size =
    mapped.size === '2xl' ||
    mapped.size === '3xl' ||
    mapped.size === '4xl' ||
    mapped.size === '5xl' ||
    mapped.size === '6xl'
      ? 'xl'
      : mapped.size;
  return (
    <Dialog.Root
      open={open ?? isOpen}
      placement={isCentered ? 'center' : mapped.placement}
      closeOnInteractOutside={closeOnOverlayClick}
      closeOnEscape={closeOnEsc}
      preventScroll={blockScrollOnMount}
      onOpenChange={(details) => {
        if (!details.open) {
          onClose?.();
        }
      }}
      {...mapped}
      size={size}
    >
      {children}
    </Dialog.Root>
  );
};

export const ModalOverlay = Dialog.Backdrop;

export const ModalContent = React.forwardRef<HTMLDivElement, DialogContentProps>(
  function ModalContent(props, ref) {
    return (
      <Dialog.Positioner>
        <Dialog.Content ref={ref} {...mapV2Props(props)} />
      </Dialog.Positioner>
    );
  }
);

export const ModalHeader = React.forwardRef<HTMLDivElement, DialogHeaderProps>(
  function ModalHeader(props, ref) {
    return <Dialog.Header ref={ref} {...mapV2Props(props)} />;
  }
);

export const ModalBody = React.forwardRef<HTMLDivElement, DialogBodyProps>(
  function ModalBody(props, ref) {
    return <Dialog.Body ref={ref} {...mapV2Props(props)} />;
  }
);

export const ModalFooter = React.forwardRef<HTMLDivElement, DialogFooterProps>(
  function ModalFooter(props, ref) {
    return <Dialog.Footer ref={ref} {...mapV2Props(props)} />;
  }
);

export const ModalCloseButton = Dialog.CloseTrigger;

export type ModalProps = ModalRootProps;
