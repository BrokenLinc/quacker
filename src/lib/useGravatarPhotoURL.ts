import React from 'react';

import {
  getGravatarAvatarUrlForEmail,
  type GravatarAvatarOptions,
} from '@@lib/gravatar';

const defaultGravatarOptions: GravatarAvatarOptions = { default: '404' };

export const useGravatarPhotoURL = (
  photoURL: string | null | undefined,
  email: string | null | undefined,
  gravatarOptions: GravatarAvatarOptions = defaultGravatarOptions
): string | undefined => {
  const [src, setSrc] = React.useState<string | undefined>(
    photoURL || undefined
  );

  React.useEffect(() => {
    if (photoURL) {
      setSrc(photoURL);
      return;
    }
    if (!email) {
      setSrc(undefined);
      return;
    }

    setSrc(undefined);
    let cancelled = false;
    getGravatarAvatarUrlForEmail(email, gravatarOptions).then((url) => {
      if (!cancelled) setSrc(url);
    });

    return () => {
      cancelled = true;
    };
  }, [photoURL, email, gravatarOptions]);

  return src;
};
