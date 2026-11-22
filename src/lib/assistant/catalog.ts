import {availableSectionLibrary} from '../section-library';
import type {SiteConfig} from '../types';

// Heading/text/items plans cannot configure media, forms, shops or other modules.
export const ASSISTANT_TEXT_SECTIONS=['hero','statement','services','split','faq','accordion','steps','richtext','cta','cards','list','timeline','notice','comparison','columns'] as const;
export const ASSISTANT_ITEM_SECTIONS=['services','split','faq','accordion','steps','richtext','cards','list','timeline','comparison','columns'] as const;
export const assistantSectionSupportsItems=(type:string)=>(ASSISTANT_ITEM_SECTIONS as readonly string[]).includes(type);
export function allowedAssistantSectionCatalog(config:SiteConfig){
 return availableSectionLibrary(config).filter(section=>(ASSISTANT_TEXT_SECTIONS as readonly string[]).includes(section.type)).map(section=>({type:section.type,label:section.name}));
}
