/** Generates a short URL-safe slug for group sharing. */
export const generateSlug = (length = 6): string => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

export const getShareUrl = (slug: string): string => {
  const base = import.meta.env.VITE_APP_URL || window.location.origin;
  return `${base}/g/${slug}`;
};
