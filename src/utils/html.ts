/** Escape user-supplied text before interpolating it into print/HTML markup. */
export const escapeHtml = (value: unknown): string =>
  String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char] || char));
