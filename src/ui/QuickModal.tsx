import * as UI from '@chakra-ui/react';
import { motion, PanInfo, useAnimation } from 'framer-motion';
import React from 'react';

export type QuickModalProps = UI.ModalProps & {
  headerContent?: React.ReactNode;
  footerContent?: React.ReactNode;
  /** Drawer placement when viewport < md (default: 'top') */
  mobilePlacement?: UI.DrawerProps['placement'];
  /**
   * Inset the mobile drawer from the screen edges with rounded corners
   * (floating sheet). Default true for floating sheets.
   */
  floating?: boolean;
};

type Shell = 'modal' | 'drawer';

type QuickModalShellProps = Omit<UI.ModalProps, 'children'>;

const modalOnlyProps = new Set([
  'isCentered',
  'size',
  'variant',
  'motionPreset',
] satisfies (keyof UI.ModalProps)[]);

const DRAG_CLOSE_FRACTION = 0.4;
const DRAG_VELOCITY_THRESHOLD = 500;

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

const floatingDrawerContentSx = (
  placement: UI.DrawerProps['placement']
): UI.SystemStyleObject => {
  const inset = '0.75rem';
  const safeTop = `calc(${inset} + env(safe-area-inset-top, 0px))`;
  const safeBottom = `calc(${inset} + env(safe-area-inset-bottom, 0px))`;

  return {
    borderRadius: 'xl',
    mx: inset,
    maxW: `calc(100% - ${inset} * 2) !important`, // override the inline style
    ...(placement === 'top'
      ? { mt: safeTop, mb: inset }
      : placement === 'bottom'
        ? { mb: safeBottom, mt: inset }
        : { my: inset }),
    // Keep height content-sized for action sheets; avoid stretching full viewport.
    h: 'auto',
    maxH: `calc(var(--app-height, 100dvh) - ${inset} * 2 - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px))`,
  };
};

function isScrollableOverflow(el: HTMLElement): boolean {
  const { overflowY } = window.getComputedStyle(el);
  return (
    (overflowY === 'auto' || overflowY === 'scroll') &&
    el.scrollHeight > el.clientHeight + 1
  );
}

/**
 * Allow sheet drag only when the gesture is not fighting an inner scroller
 * (or the scroller is already at the edge in the dismiss direction).
 */
function canStartSheetDrag(
  target: EventTarget | null,
  dismissDirection: 'up' | 'down'
): boolean {
  if (!(target instanceof Element)) return true;
  let node: HTMLElement | null =
    target instanceof HTMLElement ? target : target.parentElement;
  while (node) {
    if (isScrollableOverflow(node)) {
      if (dismissDirection === 'down') {
        return node.scrollTop <= 0;
      }
      return node.scrollTop + node.clientHeight >= node.scrollHeight - 1;
    }
    if (node.dataset.sheetRoot === 'true') break;
    node = node.parentElement;
  }
  return true;
}

const MotionDrawerContent = motion(UI.DrawerContent);

const SwipeableDrawerContent: React.FC<{
  placement: UI.DrawerProps['placement'];
  floating: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ placement, floating, onClose, children }) => {
  const controls = useAnimation();
  const dismissDirection: 'up' | 'down' =
    placement === 'top' ? 'up' : 'down';
  const allowDragRef = React.useRef(true);

  const onDragEnd = (
    e: MouseEvent | TouchEvent | PointerEvent,
    info: PanInfo
  ) => {
    if (!allowDragRef.current) {
      void controls.start({ y: 0 });
      return;
    }
    const el = e.currentTarget as HTMLElement | null;
    const height = el?.offsetHeight ?? 300;
    const { offset, velocity } = info;
    const draggedFarEnough =
      dismissDirection === 'down'
        ? offset.y > height * DRAG_CLOSE_FRACTION
        : offset.y < -height * DRAG_CLOSE_FRACTION;
    const flicked =
      dismissDirection === 'down'
        ? velocity.y > DRAG_VELOCITY_THRESHOLD
        : velocity.y < -DRAG_VELOCITY_THRESHOLD;

    if (draggedFarEnough || flicked) {
      onClose();
      return;
    }
    void controls.start({ y: 0 });
  };

  return (
    <MotionDrawerContent
      data-sheet-root="true"
      borderTopRadius={floating ? undefined : 'xl'}
      sx={floating ? floatingDrawerContentSx(placement) : undefined}
      drag="y"
      dragConstraints={{ top: 0, bottom: 0 }}
      dragElastic={0.2}
      dragDirectionLock
      animate={controls}
      initial={{ y: 0 }}
      onDragStart={(e) => {
        allowDragRef.current = canStartSheetDrag(e.target, dismissDirection);
        if (!allowDragRef.current) {
          void controls.set({ y: 0 });
        }
      }}
      onDrag={(_e, info) => {
        if (!allowDragRef.current) {
          void controls.set({ y: 0 });
          return;
        }
        // Only allow drag toward dismiss direction.
        if (dismissDirection === 'down' && info.offset.y < 0) {
          void controls.set({ y: 0 });
        }
        if (dismissDirection === 'up' && info.offset.y > 0) {
          void controls.set({ y: 0 });
        }
      }}
      onDragEnd={onDragEnd}
    >
      {children}
    </MotionDrawerContent>
  );
};

export const QuickModal: React.FC<QuickModalProps> = ({
  headerContent,
  footerContent,
  children,
  mobilePlacement = 'top',
  floating = true,
  isOpen,
  onClose,
  ...props
}) => {
  const isMobile = UI.useBreakpointValue({ base: true, md: false });
  const shell = isMobile ? 'drawer' : 'modal';

  const adaptedChildren = adaptQuickModalChildren(children, shell);
  const disclosureProps: QuickModalShellProps = { ...props, isOpen, onClose };

  if (shell === 'drawer') {
    const drawerProps = pickDrawerProps(disclosureProps, mobilePlacement);
    const handleClose = onClose ?? (() => undefined);

    return (
      <UI.Drawer {...drawerProps}>
        <UI.DrawerOverlay />
        <SwipeableDrawerContent
          placement={mobilePlacement}
          floating={floating}
          onClose={handleClose}
        >
          <UI.DrawerHeader>
            {headerContent ? headerContent : null}
            <UI.DrawerCloseButton />
          </UI.DrawerHeader>
          {adaptedChildren}
          {footerContent ? (
            <UI.DrawerFooter>{footerContent}</UI.DrawerFooter>
          ) : null}
        </SwipeableDrawerContent>
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
