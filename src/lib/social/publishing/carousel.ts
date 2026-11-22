import type {PublicationDraft, PublicationRecord, PublishingMedia} from './model';

export const MAX_CAROUSEL_ITEMS = 20;
type CarouselRecord = Pick<PublicationRecord, 'source' | 'kind' | 'slideIndex' | 'carousel' | 'media' | 'mediaItems'>;

export function isCarouselDraft(value: Pick<PublicationDraft, 'carousel'>) {
  return value.carousel === true;
}

/** A carousel is an explicit Instagram image sequence, never an inferred single slide. */
export function validCarouselSource(value: Pick<PublicationDraft, 'source' | 'kind' | 'slideIndex' | 'carousel' | 'platform' | 'connectionMode' | 'delivery' | 'carouselAltTexts'>) {
  return value.carousel === true && value.kind === 'image' && value.slideIndex === 0
    && (value.platform ?? 'instagram') === 'instagram'
    && (value.delivery === 'manual' || value.connectionMode === 'native')
    && value.source.origin !== 'upload' && value.source.origin !== 'reference'
    && (!value.carouselAltTexts || value.carouselAltTexts.length === value.source.slides)
    && value.source.kind === 'post' && value.source.slides >= 2 && value.source.slides <= MAX_CAROUSEL_ITEMS;
}

export function carouselItemsReady(value: CarouselRecord) {
  if (!value.carousel || value.kind !== 'image' || value.slideIndex !== 0 || value.source.origin === 'upload'
    || value.source.origin === 'reference' || value.source.kind !== 'post') return false;
  const items = value.mediaItems ?? [], count = value.source.slides, first = items[0];
  if (count < 2 || count > MAX_CAROUSEL_ITEMS || items.length !== count || !first
    || value.media?.id !== first.id || value.media.sha256 !== first.sha256) return false;
  const ids = new Set<string>();
  return items.every((item, index) => {
    if (ids.has(item.id)) return false;
    ids.add(item.id);
    return item.slideIndex === index && item.kind === 'image' && item.mimeType === 'image/jpeg'
      && item.sourceHash === value.source.snapshotHash && item.width === first.width && item.height === first.height;
  });
}

export function carouselMediaKey(items: PublishingMedia[] = []) {
  return JSON.stringify(items.map(item => ({id: item.id, sha256: item.sha256, sourceHash: item.sourceHash, slideIndex: item.slideIndex})));
}

/** Preserve the legacy single-file hash; a sequence approval binds every image in order. */
export function approvedMediaHash(value: Pick<PublicationRecord, 'carousel' | 'media' | 'mediaItems'>, hash: (value: string) => string, emptyHash: string) {
  return value.carousel ? hash(carouselMediaKey(value.mediaItems)) : value.media?.sha256 ?? emptyHash;
}
