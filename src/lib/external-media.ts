/** Native files still need permission when they are served by another origin. */
export function nativeVideoSource(value: string | undefined, origin?: string | null): {url:string; external:boolean} | null {
  if (!value || value !== value.trim() || /[\\\u0000-\u001f\u007f]/.test(value) || value.startsWith('//')) return null;
  try {
    const url = new URL(value, origin ?? 'https://own-media.invalid');
    if (url.username || url.password || !/\.(?:mp4|webm)$/i.test(url.pathname)) return null;
    const relative = value.startsWith('/');
    if (url.protocol !== 'https:' && !(origin && url.origin === origin && url.protocol === 'http:')) return null;
    return {url:value, external:!relative && (!origin || url.origin !== origin)};
  } catch { return null; }
}
