import preset from '../../../profiles/creator-engagement.json';
import type {ImageValue,SectionContent} from '../types';

/** The generator and optional section library share this neutral, source-owned preset. */
export function createEngagementContent():SectionContent {
  return structuredClone(preset) as SectionContent;
}

/** A newly chosen file must never keep requesting the previous file's responsive variants. */
export function engagementPhotoValue(previous:ImageValue|undefined,next:ImageValue):ImageValue {
  if(previous?.src===next.src)return next;
  const {srcSet:_srcSet,sizes:_sizes,width:_width,height:_height,...image}=next;
  return image;
}
