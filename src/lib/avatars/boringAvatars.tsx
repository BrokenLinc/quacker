import BoringAvatar from 'boring-avatars';

import { boringAvatarConfig } from './boringAvatarConfig';

type GeneratedAvatarProps = {
  seed: string;
  sizePx: number;
};

export const GeneratedAvatar = ({ seed, sizePx }: GeneratedAvatarProps) => (
  <BoringAvatar
    name={seed}
    size={sizePx}
    variant={boringAvatarConfig.variant}
    colors={boringAvatarConfig.colors}
  />
);
