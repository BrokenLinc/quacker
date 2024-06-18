export const formatPhone = (value?: string | null) => {
  if (!value) return '';
  if (value.length <= 10) {
    return value.replace(/(\d{3})(\d{3})(\d{4})/, '($1) $2-$3');
  }
  // With extension
  return value.replace(/(\d{3})(\d{3})(\d{4})(\d*)/, '($1) $2-$3 x $4');
};
