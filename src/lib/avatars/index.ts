export {
  getGravatarAvatarUrl,
  getGravatarAvatarUrlForEmail,
  getGravatarHash,
  normalizeGravatarEmail,
  resolvePhotoURL,
  type GravatarAvatarOptions,
} from './gravatar';
export { boringAvatarConfig } from './boringAvatarConfig';
export { GeneratedAvatar } from './boringAvatars';
export { avatarSizeToPx } from './sizes';

export type AvatarSeedInput = {
  uid?: string | null;
  phone?: string | null;
  email?: string | null;
  name?: string | null;
};

export const getAvatarSeed = ({
  uid,
  phone,
  email,
  name,
}: AvatarSeedInput): string =>
  uid?.trim() ||
  phone?.trim() ||
  email?.trim() ||
  name?.trim() ||
  '';
