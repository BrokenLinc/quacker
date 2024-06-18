import * as UI from '@chakra-ui/react';

export type QuickModalProps = UI.ModalProps & {
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
};

export const QuickModal: React.FC<QuickModalProps> = ({
  headerContent,
  footerContent,
  children,
  ...props
}) => {
  return (
    <UI.Modal {...props}>
      <UI.ModalOverlay />
      <UI.ModalContent>
        <UI.ModalHeader>
          {headerContent ? headerContent : null}
          <UI.ModalCloseButton />
        </UI.ModalHeader>
        {children}
        {footerContent ? (
          <UI.ModalFooter>{footerContent}</UI.ModalFooter>
        ) : null}
      </UI.ModalContent>
    </UI.Modal>
  );
};
