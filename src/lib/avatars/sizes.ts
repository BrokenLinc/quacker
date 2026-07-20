import type { AvatarProps } from '@chakra-ui/react';

const AVATAR_SIZE_PX: Record<string, number> = {
  xs: 24,
  sm: 32,
  md: 48,
  lg: 64,
  xl: 128,
  '2xl': 256,
};

export const avatarSizeToPx = (size: AvatarProps['size'] | number = 'md'): number => {
  if (typeof size === 'number') return size;
  if (typeof size === 'string' && size in AVATAR_SIZE_PX) {
    return AVATAR_SIZE_PX[size];
  }
  return AVATAR_SIZE_PX.md;
};
