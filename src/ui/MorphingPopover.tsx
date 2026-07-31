import * as Chakra from '@chakra-ui/react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  AnimatePresence,
  MotionConfig,
  isValidMotionProp,
  motion,
  type Transition,
  type Variants,
} from 'framer-motion';
import React from 'react';

import { IconButton } from './IconButton';

/** Chakra + framer-motion: use StyleProps (not BoxProps) — BoxProps HTML `onDrag` clashes with Motion. */
const chakraMotionForwardProp = (prop: string): boolean =>
  isValidMotionProp(prop) || Chakra.shouldForwardProp(prop);

const MotionDiv = Chakra.chakra(motion.div, {
  shouldForwardProp: chakraMotionForwardProp,
});

const MotionButton = Chakra.chakra(motion.button, {
  shouldForwardProp: chakraMotionForwardProp,
});

const DEFAULT_TRANSITION: Transition = {
  type: 'spring',
  bounce: 0.1,
  duration: 0.4,
};

const REDUCED_MOTION_TRANSITION: Transition = {
  type: 'tween',
  duration: 0.01,
};

type MorphingPopoverContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  uniqueId: string;
  variants?: Variants;
  placement: 'top' | 'bottom';
  align: 'start' | 'end';
};

const MorphingPopoverContext =
  React.createContext<MorphingPopoverContextValue | null>(null);

function useMorphingPopoverContext(): MorphingPopoverContextValue {
  const ctx = React.useContext(MorphingPopoverContext);
  if (!ctx) {
    throw new Error(
      'MorphingPopover compound parts must be used within MorphingPopover'
    );
  }
  return ctx;
}

function useClickOutside(
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
  enabled: boolean
): void {
  React.useEffect(() => {
    if (!enabled) return;

    const onPointer = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      if (!el || el.contains(event.target as Node)) return;
      handler();
    };

    document.addEventListener('mousedown', onPointer);
    document.addEventListener('touchstart', onPointer);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('touchstart', onPointer);
    };
  }, [ref, handler, enabled]);
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = React.useState(false);
  React.useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);
  return reduced;
}

export type MorphingPopoverProps = {
  children: React.ReactNode;
  transition?: Transition;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variants?: Variants;
  /** Panel opens above (top) or below (bottom) the trigger. */
  placement?: 'top' | 'bottom';
  /** Horizontal alignment relative to the trigger. */
  align?: 'start' | 'end';
} & Omit<Chakra.BoxProps, 'children' | 'transition'>;

export const MorphingPopover: React.FC<MorphingPopoverProps> = ({
  children,
  transition = DEFAULT_TRANSITION,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  variants,
  placement = 'bottom',
  align = 'end',
  ...boxProps
}) => {
  const uniqueId = React.useId();
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(defaultOpen);
  const isOpen = controlledOpen ?? uncontrolledOpen;
  const reducedMotion = usePrefersReducedMotion();

  const open = React.useCallback(() => {
    if (controlledOpen === undefined) setUncontrolledOpen(true);
    onOpenChange?.(true);
  }, [controlledOpen, onOpenChange]);

  const close = React.useCallback(() => {
    if (controlledOpen === undefined) setUncontrolledOpen(false);
    onOpenChange?.(false);
  }, [controlledOpen, onOpenChange]);

  const value = React.useMemo(
    () => ({ isOpen, open, close, uniqueId, variants, placement, align }),
    [isOpen, open, close, uniqueId, variants, placement, align]
  );

  return (
    <MorphingPopoverContext.Provider value={value}>
      <MotionConfig
        transition={reducedMotion ? REDUCED_MOTION_TRANSITION : transition}
      >
        <Chakra.Box
          position="relative"
          display="inline-flex"
          alignItems="center"
          justifyContent="center"
          {...boxProps}
        >
          {children}
        </Chakra.Box>
      </MotionConfig>
    </MorphingPopoverContext.Provider>
  );
};

export type MorphingPopoverTriggerProps = {
  children: React.ReactNode;
  'aria-label'?: string;
  'data-testid'?: string;
} & Chakra.StyleProps;

export const MorphingPopoverTrigger: React.FC<MorphingPopoverTriggerProps> = ({
  children,
  ...styleProps
}) => {
  const { isOpen, open, uniqueId } = useMorphingPopoverContext();

  return (
    <MotionButton
      type="button"
      layoutId={`popover-trigger-${uniqueId}`}
      onClick={open}
      cursor="pointer"
      lineHeight={0}
      display="inline-flex"
      alignItems="center"
      justifyContent="center"
      p={0}
      m={0}
      bg="transparent"
      border="none"
      // Hide the trigger shell while the panel owns the shared layoutId.
      visibility={isOpen ? 'hidden' : 'visible'}
      pointerEvents={isOpen ? 'none' : 'auto'}
      aria-expanded={isOpen}
      aria-haspopup="dialog"
      aria-controls={`popover-content-${uniqueId}`}
      {...styleProps}
    >
      {children}
    </MotionButton>
  );
};

export type MorphingPopoverContentProps = {
  children: React.ReactNode;
  /** Accessible / header title for the dialog. */
  title?: React.ReactNode;
} & Chakra.StyleProps;

export const MorphingPopoverContent: React.FC<MorphingPopoverContentProps> = ({
  children,
  title,
  ...styleProps
}) => {
  const { isOpen, close, uniqueId, variants, placement, align } =
    useMorphingPopoverContext();
  const ref = React.useRef<HTMLDivElement>(null);

  useClickOutside(ref, close, isOpen);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  return (
    <AnimatePresence>
      {isOpen ? (
        <MotionDiv
          ref={ref}
          layoutId={`popover-trigger-${uniqueId}`}
          id={`popover-content-${uniqueId}`}
          role="dialog"
          aria-modal="true"
          aria-label={typeof title === 'string' ? title : undefined}
          initial="initial"
          animate="animate"
          exit="exit"
          variants={
            variants ?? {
              initial: { opacity: 0 },
              animate: { opacity: 1 },
              exit: { opacity: 0 },
            }
          }
          position="absolute"
          zIndex="popover"
          {...(placement === 'top'
            ? { bottom: 'calc(100% + 0.5rem)' }
            : { top: 'calc(100% + 0.5rem)' })}
          {...(align === 'start' ? { left: 0 } : { right: 0 })}
          bg="surface.raised"
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="xl"
          boxShadow="lg"
          overflow="hidden"
          minW="220px"
          maxW="min(320px, calc(100vw - 1.5rem))"
          {...styleProps}
        >
          <Chakra.HStack
            px={3}
            pt={2}
            pb={1}
            spacing={2}
            align="center"
            borderBottomWidth="1px"
            borderColor="border.subtle"
          >
            <Chakra.Box flex={1} minW={0}>
              {title ? (
                <Chakra.Text fontSize="sm" fontWeight="bold" noOfLines={1}>
                  {title}
                </Chakra.Text>
              ) : null}
            </Chakra.Box>
            <IconButton
              aria-label="Close"
              icon={faXmark}
              size="sm"
              variant="ghost"
              onClick={close}
            />
          </Chakra.HStack>
          {children}
        </MotionDiv>
      ) : null}
    </AnimatePresence>
  );
};
