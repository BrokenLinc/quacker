import * as Chakra from '@chakra-ui/react';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import {
  AnimatePresence,
  LayoutGroup,
  MotionConfig,
  isValidMotionProp,
  motion,
  type Transition,
  type Variants,
} from 'framer-motion';
import React from 'react';
import { createPortal } from 'react-dom';

import { IconButton } from './IconButton';
import {
  placeAndClamp,
  readVisualViewport,
  type MorphingPopoverAnchor,
} from './morphingPopoverPosition';

export type { MorphingPopoverAnchor } from './morphingPopoverPosition';

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

const VIEWPORT_MARGIN = 12;
const PANEL_MAX_WIDTH = 320;

type PanelCoords = {
  left: number;
  top: number;
  maxHeight: number;
  maxWidth: number;
};

type MorphingPopoverContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  uniqueId: string;
  variants?: Variants;
  anchor: MorphingPopoverAnchor;
  rootRef: React.RefObject<HTMLDivElement | null>;
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

function coordsEqual(a: PanelCoords | null, b: PanelCoords): boolean {
  return (
    !!a &&
    a.left === b.left &&
    a.top === b.top &&
    a.maxHeight === b.maxHeight &&
    a.maxWidth === b.maxWidth
  );
}

export type MorphingPopoverProps = {
  children: React.ReactNode;
  transition?: Transition;
  defaultOpen?: boolean;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  variants?: Variants;
  /**
   * Shared 9-point anchor on trigger and panel. Those points coincide on open;
   * the panel is then clamped into the visual viewport.
   */
  anchor?: MorphingPopoverAnchor;
} & Omit<Chakra.BoxProps, 'children' | 'transition'>;

export const MorphingPopover: React.FC<MorphingPopoverProps> = ({
  children,
  transition = DEFAULT_TRANSITION,
  defaultOpen = false,
  open: controlledOpen,
  onOpenChange,
  variants,
  anchor = 'center',
  ...boxProps
}) => {
  const uniqueId = React.useId();
  const rootRef = React.useRef<HTMLDivElement>(null);
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
    () => ({ isOpen, open, close, uniqueId, variants, anchor, rootRef }),
    [isOpen, open, close, uniqueId, variants, anchor]
  );

  return (
    <MorphingPopoverContext.Provider value={value}>
      <MotionConfig
        transition={reducedMotion ? REDUCED_MOTION_TRANSITION : transition}
      >
        <LayoutGroup id={uniqueId}>
          <Chakra.Box
            ref={rootRef}
            position="relative"
            display="inline-flex"
            alignItems="center"
            justifyContent="center"
            {...boxProps}
          >
            {children}
          </Chakra.Box>
        </LayoutGroup>
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
      // Do not use lineHeight={0} — it collapses text triggers (e.g. room title).
      lineHeight="normal"
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
  const { isOpen, close, uniqueId, variants, anchor, rootRef } =
    useMorphingPopoverContext();
  const ref = React.useRef<HTMLDivElement>(null);
  const [coords, setCoords] = React.useState<PanelCoords | null>(null);
  const [portalReady, setPortalReady] = React.useState(false);

  React.useEffect(() => {
    setPortalReady(true);
  }, []);

  useClickOutside(ref, close, isOpen);

  React.useEffect(() => {
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, close]);

  const updatePosition = React.useCallback(() => {
    const triggerEl = rootRef.current;
    const panelEl = ref.current;
    if (!triggerEl || !panelEl) return;

    const trigger = triggerEl.getBoundingClientRect();
    // Prefer natural content size (scroll*) so clamps don't shrink the measure.
    const panelSize = {
      width: Math.min(
        PANEL_MAX_WIDTH,
        Math.max(panelEl.offsetWidth, panelEl.scrollWidth)
      ),
      height: Math.max(panelEl.offsetHeight, panelEl.scrollHeight),
    };

    const next = placeAndClamp({
      trigger,
      panelSize,
      anchor,
      viewport: readVisualViewport(),
      margin: VIEWPORT_MARGIN,
    });
    setCoords((prev) => (coordsEqual(prev, next) ? prev : next));
  }, [anchor, rootRef]);

  React.useLayoutEffect(() => {
    if (!isOpen) {
      setCoords(null);
      return;
    }
    updatePosition();
  }, [isOpen, updatePosition]);

  React.useEffect(() => {
    if (!isOpen) return;

    const onReposition = () => updatePosition();
    window.addEventListener('resize', onReposition);
    window.addEventListener('scroll', onReposition, true);
    const vv = window.visualViewport;
    vv?.addEventListener('resize', onReposition);
    vv?.addEventListener('scroll', onReposition);

    const panelEl = ref.current;
    const ro =
      panelEl && typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(onReposition)
        : null;
    if (panelEl && ro) ro.observe(panelEl);

    return () => {
      window.removeEventListener('resize', onReposition);
      window.removeEventListener('scroll', onReposition, true);
      vv?.removeEventListener('resize', onReposition);
      vv?.removeEventListener('scroll', onReposition);
      ro?.disconnect();
    };
  }, [isOpen, updatePosition]);

  // Portal escapes AppShell overflow:hidden; LayoutGroup context keeps layoutId morph.
  if (!portalReady) return null;

  return createPortal(
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
          position="fixed"
          zIndex="popover"
          left={coords ? `${coords.left}px` : 0}
          top={coords ? `${coords.top}px` : 0}
          w={coords ? `${coords.maxWidth}px` : undefined}
          maxH={coords ? `${coords.maxHeight}px` : undefined}
          visibility={coords ? 'visible' : 'hidden'}
          bg="surface.raised"
          borderWidth="1px"
          borderColor="border.subtle"
          borderRadius="xl"
          boxShadow="lg"
          overflow="hidden"
          overflowY="auto"
          minW={coords ? undefined : '220px'}
          maxW={`${PANEL_MAX_WIDTH}px`}
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
    </AnimatePresence>,
    document.body
  );
};
