import * as UI from '@@ui';
import React from 'react';

import { type GravatarAvatarOptions } from '@@lib/gravatar';
import { useGravatarPhotoURL } from '@@lib/useGravatarPhotoURL';

type UserAvatarProps = Omit<UI.AvatarProps, 'name' | 'src'> & {
  name?: string | null;
  email?: string | null;
  photoURL?: string | null;
  gravatarOptions?: GravatarAvatarOptions;
};

export const UserAvatar = React.forwardRef<HTMLSpanElement, UserAvatarProps>(
  function UserAvatar(
    { name, email, photoURL, gravatarOptions, size = 'sm', ...rest },
    ref
  ) {
    const src = useGravatarPhotoURL(photoURL, email, gravatarOptions);

    return (
      <UI.Avatar
        ref={ref}
        name={name || ''}
        src={src}
        size={size}
        {...rest}
      />
    );
  }
);
