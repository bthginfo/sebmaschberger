import type {ImageValue, WebsiteContent} from './types';

type MediaKind = 'image' | 'video' | 'audio' | 'captions';
const objectUrls = new Map<string, MediaKind>();
const extensions: Record<MediaKind, RegExp> = {
  image: /\.(?:png|jpe?g|webp|avif|gif)$/i,
  video: /\.(?:mp4|webm)$/i,
  audio: /\.(?:mp3|wav|ogg|m4a)$/i,
  captions: /\.vtt$/i,
};

/** Only URLs created from checked local files may enter the demo as object URLs. */
export function registerIsolatedObjectUrl(url: string, mime: string) {
  if (url.startsWith('blob:') && /^image\/(?:png|jpeg|webp)$/.test(mime)) objectUrls.set(url, 'image');
  return () => objectUrls.delete(url);
}

export function isolatedMediaUrl(value: string | undefined, kind: MediaKind = 'image'): string | undefined {
  if (!value || value !== value.trim() || /[\\\u0000-\u0020\u007f]/.test(value)) return undefined;
  if (objectUrls.get(value) === kind) return value;
  if (kind === 'image' && value.length <= 1_400_000 && /^data:image\/(?:png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value)) return value;
  if (!/^\/(?:assets|media|social-studio)\//.test(value) || /[?#]/.test(value)) return undefined;
  let decoded = value;
  try { for (let count = 0; count < 3; count++) { const next = decodeURIComponent(decoded); if (next === decoded) break; decoded = next; } } catch { return undefined; }
  if (/[\\%\u0000-\u0020\u007f]/.test(decoded) || decoded.split('/').some(part => part === '.' || part === '..') || !/^\/(?:assets|media|social-studio)\//.test(decoded)) return undefined;
  if (kind === 'image' && /^\/media\/placeholder-(?:landscape|portrait|detail)\.svg$/.test(decoded)) return value;
  return extensions[kind].test(decoded) ? value : undefined;
}

export function isolatedSrcSet(value?: string): string | undefined {
  if (!value) return undefined;
  const entries = value.split(',');
  if (entries.length > 8 || entries.some(entry => { const parts = entry.trim().split(/\s+/); return parts.length !== 2 || !isolatedMediaUrl(parts[0]) || !/^\d{2,5}w$/.test(parts[1]); })) return undefined;
  return value;
}

export function isolatedImage(image?: ImageValue): ImageValue | undefined {
  const src = isolatedMediaUrl(image?.src);
  return image && src ? {...image, src, srcSet: isolatedSrcSet(image.srcSet)} : undefined;
}

/** Run before rendering visitor edits, as well as at every local storage boundary. */
export function isolateWebsiteMedia(content: WebsiteContent): WebsiteContent {
  const next = structuredClone(content);
  const clean = (value: unknown): void => {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) { value.forEach(clean); return; }
    const record = value as Record<string, unknown>;
    for (const [key, child] of Object.entries(record)) {
      if (typeof child === 'string' && ['src', 'image', 'poster', 'videoUrl', 'mediaUrl'].includes(key)) {
        record[key] = ['src', 'image', 'poster'].includes(key) ? isolatedMediaUrl(child) ?? '' : isolatedMediaUrl(child, 'video') ?? isolatedMediaUrl(child, 'audio') ?? '';
      } else if (key === 'srcSet' && typeof child === 'string') record[key] = isolatedSrcSet(child);
      else if (key === 'tags' && Array.isArray(child)) record[key] = child.filter(tag => typeof tag !== 'string' || !tag.startsWith('captions:') || Boolean(isolatedMediaUrl(tag.slice(9), 'captions')));
      else clean(child);
    }
  };
  clean(next);
  return next;
}

/** A changed source must not retain responsive variants or dimensions from its predecessor. */
export function replaceImageSource(image: ImageValue, src: string): ImageValue {
  if (image.src === src) return image;
  const {srcSet: _srcSet, sizes: _sizes, width: _width, height: _height, ...copy} = image;
  return {...copy, src};
}
