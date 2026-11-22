import type {CSSProperties} from 'react';
import type {SectionDesign} from '@/lib/types';

type CreatorStyle=CSSProperties&{
 '--creator-section-bg'?:string;
 '--creator-section-ink'?:string;
 '--creator-section-accent'?:string;
};
export function creatorSectionStyle(design:SectionDesign):CreatorStyle{
 const background=design.background||undefined;
 const color=design.textColor||undefined;
 return {
  position:'relative',minWidth:0,background,color,
  '--creator-section-bg':background,
  '--creator-section-ink':color,
  '--creator-section-accent':design.accentColor||undefined
 };
}
