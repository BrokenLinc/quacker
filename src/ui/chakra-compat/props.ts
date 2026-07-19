import type { SystemStyleObject } from '@chakra-ui/react';

/** Map common Chakra v2 boolean/style props to v3 equivalents. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function mapV2Props(props: any): any {
  const {
    isDisabled,
    isInvalid,
    isRequired,
    isReadOnly,
    isOpen,
    isAttached,
    isLazy,
    isRound,
    isLoading,
    isActive,
    colorScheme,
    spacing,
    sx,
    noOfLines,
    variant,
    ...rest
  } = props;

  const resolvedVariant =
    variant === 'block' ? 'solid' : variant === 'link' ? 'plain' : variant;

  return {
    ...rest,
    ...(resolvedVariant !== undefined ? { variant: resolvedVariant } : null),
    ...(isDisabled !== undefined ? { disabled: isDisabled } : null),
    ...(isInvalid !== undefined ? { invalid: isInvalid } : null),
    ...(isRequired !== undefined ? { required: isRequired } : null),
    ...(isReadOnly !== undefined ? { readOnly: isReadOnly } : null),
    ...(isOpen !== undefined ? { open: isOpen } : null),
    ...(isAttached !== undefined ? { attached: isAttached } : null),
    ...(isLazy !== undefined ? { lazyMount: isLazy } : null),
    ...(isRound !== undefined ? { borderRadius: 'full' } : null),
    ...(isLoading !== undefined ? { loading: isLoading } : null),
    ...(isActive !== undefined ? { 'data-active': isActive || undefined } : null),
    ...(colorScheme !== undefined ? { colorPalette: colorScheme } : null),
    ...(spacing !== undefined ? { gap: spacing } : null),
    ...(noOfLines !== undefined ? { lineClamp: noOfLines } : null),
    ...(sx !== undefined ? { css: normalizeSx(sx as SystemStyleObject) } : null),
  };
}

function normalizeSx(sx: SystemStyleObject): Record<string, unknown> {
  const css: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(sx as Record<string, unknown>)) {
    if (key.startsWith('&') || key.startsWith('@') || key.startsWith('.')) {
      css[key] = value;
    } else if (/^[a-z][\w-]*$/.test(key) && !key.includes('.')) {
      css[`& ${key}`] = value;
    } else {
      css[key] = value;
    }
  }
  return css;
}
