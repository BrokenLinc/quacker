import * as UI from '@chakra-ui/react';
import React from 'react';

export type QuickModalProps = UI.ModalProps & {
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  /** Drawer placement when viewport < md (default: 'bottom') */
  mobilePlacement?: UI.DrawerProps['placement'];
};

type Shell = 'modal' | 'drawer';

type QuickModalShellProps = Omit<UI.ModalProps, 'children'>;

const modalOnlyProps = new Set([
  'isCentered',
  'size',
  'variant',
  'motionPreset',
] satisfies (keyof UI.ModalProps)[]);

function mapModalSizeToDrawerSize(
  size: UI.ModalProps['size']
): UI.DrawerProps['size'] {
  if (size === 'sm' || size === 'md') return 'md';
  if (size === 'lg' || size === 'xl' || size === '2xl' || size === '3xl') {
    return 'full';
  }
  if (size === 'xs' || size === 'full') return size;
  return 'full';
}

function adaptQuickModalChildren(
  children: React.ReactNode,
  shell: Shell
): React.ReactNode {
  if (shell === 'modal') return children;

  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) return child;

    if (child.type === UI.ModalBody) {
      const body = child as React.ReactElement<
        React.ComponentProps<typeof UI.ModalBody>
      >;
      return (
        <UI.DrawerBody {...body.props}>{body.props.children}</UI.DrawerBody>
      );
    }

    if (child.type === UI.ModalFooter) {
      const footer = child as React.ReactElement<
        React.ComponentProps<typeof UI.ModalFooter>
      >;
      return (
        <UI.DrawerFooter {...footer.props}>
          {footer.props.children}
        </UI.DrawerFooter>
      );
    }

    const element = child as React.ReactElement<{ children?: React.ReactNode }>;
    if (element.props.children) {
      return React.cloneElement(
        element,
        element.props,
        adaptQuickModalChildren(element.props.children, shell)
      );
    }

    return child;
  });
}

function pickDrawerProps(
  props: QuickModalShellProps,
  mobilePlacement: UI.DrawerProps['placement']
): UI.DrawerProps {
  const drawerProps = { ...props } as UI.DrawerProps & Record<string, unknown>;

  for (const key of modalOnlyProps) {
    delete drawerProps[key];
  }

  drawerProps.placement = mobilePlacement;
  drawerProps.size = mapModalSizeToDrawerSize(props.size);

  return drawerProps;
}

export const QuickModal: React.FC<QuickModalProps> = ({
  headerContent,
  footerContent,
  children,
  mobilePlacement = 'bottom',
  isOpen,
  ...props
}) => {
  const isMobile = UI.useBreakpointValue({ base: true, md: false });
  const shell = isMobile ? 'drawer' : 'modal';

  const adaptedChildren = adaptQuickModalChildren(children, shell);
  const disclosureProps: QuickModalShellProps = { ...props, isOpen };

  if (shell === 'drawer') {
    const drawerProps = pickDrawerProps(disclosureProps, mobilePlacement);

    return (
      <UI.Drawer {...drawerProps}>
        <UI.DrawerOverlay />
        <UI.DrawerContent borderTopRadius="xl">
          <UI.DrawerHeader>
            {headerContent ? headerContent : null}
            <UI.DrawerCloseButton />
          </UI.DrawerHeader>
          {adaptedChildren}
          {footerContent ? (
            <UI.DrawerFooter>{footerContent}</UI.DrawerFooter>
          ) : null}
        </UI.DrawerContent>
      </UI.Drawer>
    );
  }

  return (
    <UI.Modal {...disclosureProps}>
      <UI.ModalOverlay />
      <UI.ModalContent>
        <UI.ModalHeader>
          {headerContent ? headerContent : null}
          <UI.ModalCloseButton />
        </UI.ModalHeader>
        {adaptedChildren}
        {footerContent ? (
          <UI.ModalFooter>{footerContent}</UI.ModalFooter>
        ) : null}
      </UI.ModalContent>
    </UI.Modal>
  );
};
