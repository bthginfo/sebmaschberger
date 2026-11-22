import type {ReactNode} from 'react';
import type {PageContent,Section,SiteConfig} from '../types';
export type {CreatorHeroPreset,CreatorPlatform,CommerceProduct,SiteModules} from '../types';
export interface CreatorSectionProps {section:Section;site:SiteConfig;editable?:boolean;selected?:boolean;onSelect?:()=>void;onChange?:(section:Section)=>void}
export interface CreatorLayoutProps {cartHref?:string;page:PageContent;site:SiteConfig;editable?:boolean;children:ReactNode}
export const CREATOR_HERO_PRESETS=['gaming','beauty','fitness','food','travel','fashion','music','tech','lifestyle','art'] as const;
export const CREATOR_PLATFORMS=['instagram','tiktok','youtube','twitch','spotify','discord'] as const;
export const creatorEnabled=(site:SiteConfig)=>site.modules?.creator?.enabled===true;
export const commerceEnabled=(site:SiteConfig)=>site.modules?.commerce?.enabled===true;
