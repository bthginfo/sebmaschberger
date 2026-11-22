import preset from '../../../profiles/creator-journey.json';
import type {ContentItem,SectionContent} from '../types';
import {remixInquiryHref} from './remix';

export const JOURNEY_MODES=['event','shop','kit'] as const;
export type JourneyMode=typeof JOURNEY_MODES[number];
export function journeyMode(item:ContentItem):JourneyMode{return JOURNEY_MODES.find(mode=>item.tags?.includes(mode))??'event';}
export function journeyItems(items:ContentItem[]=[]){return items.filter(item=>!item.tags?.includes('ui'));}
export function createJourneyContent():SectionContent{return structuredClone(preset) as SectionContent;}
export function journeyDetail(item:ContentItem,key:string,value:string):ContentItem {
  const details=[...(item.details??[])],index=details.findIndex(detail=>detail.startsWith(`${key}|`));
  if(index<0)details.push(`${key}|${value}`);else details[index]=`${key}|${value}`;
  return {...item,details};
}
export function journeyInquiryHref(content:SectionContent,item:ContentItem,message:string,subject='Creator-Website'){
  return remixInquiryHref(item.href||content.primaryHref,`${subject} · ${item.title}`,message);
}
