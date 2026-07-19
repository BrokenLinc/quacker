const hashCache = new Map<string, string>();

export type GravatarAvatarOptions = {
  size?: number;
  default?: '404' | 'mp' | 'identicon' | 'monsterid' | 'wavatar' | 'retro' | 'robohash';
};

export const normalizeGravatarEmail = (email: string): string =>
  email.trim().toLowerCase();

export const getGravatarHash = async (email: string): Promise<string> => {
  const normalized = normalizeGravatarEmail(email);
  const cached = hashCache.get(normalized);
  if (cached) return cached;

  const hashBuffer = await crypto.subtle.digest(
    'SHA-256',
    new TextEncoder().encode(normalized)
  );
  const hash = Array.from(new Uint8Array(hashBuffer))
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('');

  hashCache.set(normalized, hash);
  return hash;
};

export const getGravatarAvatarUrl = (
  hash: string,
  options: GravatarAvatarOptions = {}
): string => {
  const params = new URLSearchParams();
  if (options.size) params.set('s', String(options.size));
  if (options.default) params.set('d', options.default);
  const query = params.toString();
  return `https://0.gravatar.com/avatar/${hash}${query ? `?${query}` : ''}`;
};

export const getGravatarAvatarUrlForEmail = async (
  email: string,
  options: GravatarAvatarOptions = {}
): Promise<string> => {
  const hash = await getGravatarHash(email);
  return getGravatarAvatarUrl(hash, options);
};

export const resolvePhotoURL = async (
  photoURL: string | null | undefined,
  email: string | null | undefined,
  options: GravatarAvatarOptions = { default: '404' }
): Promise<string | null> => {
  if (photoURL) return photoURL;
  if (!email) return null;
  return getGravatarAvatarUrlForEmail(email, options);
};
