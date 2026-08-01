/**
 * Vendor attributes that tell password managers not to offer fill/save.
 * `autoComplete="off"` alone is ignored by most managers on purpose.
 *
 * @see https://developer.1password.com/docs/web/compatible-website-design/
 */
export const passwordManagerIgnoreProps = {
  'data-1p-ignore': true,
  'data-lpignore': 'true',
  'data-bwignore': true,
  'data-form-type': 'other',
} as const;
