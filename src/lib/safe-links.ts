/** Shared URL validation only; safe to import in browser-side CMS schemas. */
export function safeLink(value: string): boolean {
  if (!value || value.startsWith('#')) return true;
  if (value.startsWith('/') && !value.startsWith('//') && !value.includes('\\')) return true;
  if (/^tel:\+?[\d\s().\/-]+$/.test(value)) return true;
  if (/^mailto:[^\s<>\r\n]+@[^\s<>\r\n]+$/.test(value)) return true;
  try { const url = new URL(value); return url.protocol === 'https:' || url.protocol === 'http:'; } catch { return false; }
}
