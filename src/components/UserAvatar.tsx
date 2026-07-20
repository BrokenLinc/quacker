import * as UI from '@@ui';
import React from 'react';

import {
  GeneratedAvatar,
  avatarSizeToPx,
  getAvatarSeed,
} from '@@lib/avatars';

type UserAvatarProps = Omit<UI.AvatarProps, 'name' | 'src'> & {
  name?: string | null;
  photoURL?: string | null;
  seed?: string | null;
  uid?: string | null;
  phone?: string | null;
  email?: string | null;
};

export const UserAvatar = React.forwardRef<HTMLSpanElement, UserAvatarProps>(
  function UserAvatar(
    {
      name,
      photoURL,
      seed,
      uid,
      phone,
      email,
      size = 'sm',
      ...rest
    },
    ref
  ) {
    const sizePx = avatarSizeToPx(size);
    const avatarSeed =
      seed ??
      getAvatarSeed({ uid, phone, email, name });

    if (photoURL) {
      return (
        <UI.Avatar
          ref={ref}
          name={name || ''}
          src={photoURL}
          size={size}
          {...rest}
        />
      );
    }

    return (
      <UI.Box
        ref={ref}
        display="inline-flex"
        flexShrink={0}
        alignItems="center"
        justifyContent="center"
        borderRadius="full"
        overflow="hidden"
        w={`${sizePx}px`}
        h={`${sizePx}px`}
        {...rest}
      >
        <GeneratedAvatar seed={avatarSeed || 'anonymous'} sizePx={sizePx} />
      </UI.Box>
    );
  }
);
