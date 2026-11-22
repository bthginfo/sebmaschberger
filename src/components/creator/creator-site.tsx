"use client";
import {sectionEntrance} from "@/components/site/site-motion";
import {useContext} from "react";
import {creatorSectionStyle} from "./creator-section-style";
import {SiteInteractionContext} from "@/components/site/editable";
import {CreatorMarketingLayout} from './marketing/creator-marketing-layout';
import {CreatorProfileLayout} from './profile/creator-profile-layout';
import {CreatorDemoExperience} from './demo/creator-demo-experience';
import {CreatorHero} from './heroes/creator-hero';
import {CreatorHeroStack} from './heroes/creator-hero-stack';
import {CreatorScrollStory} from './story/creator-scroll-story';
import {CreatorLens} from './lens/creator-lens';
import {CreatorOrbit} from './orbit/creator-orbit';
import {CreatorRemix} from './remix/creator-remix';
import {CreatorEngagement} from './engagement/creator-engagement';
import {CreatorJourney} from './journey/creator-journey';
import {CreatorTools} from './tools/creator-tools';
import {CreatorSocial} from './social/creator-social';
import {CreatorShop} from './shop/creator-shop';
import {CommerceStorefront} from './commerce-storefront';
import {CreatorCartProvider} from './shop/cart-state';
import {CreatorMediaKit,CreatorLinks} from './profile/creator-sections';

import type {CreatorSectionProps} from '@/lib/creator/types';
import type {VariantSiteProps} from '../site/variants/types';
export function CreatorSite(props:VariantSiteProps){const Layout=props.site.modules?.creator?.surface==='profile'?CreatorProfileLayout:CreatorMarketingLayout;return <CreatorCartProvider site={props.site}><Layout cartHref={props.cartHref} page={props.page} site={props.site} editable={props.editable}>{props.page.sections.filter(s=>s.visible||props.editable).map(props.fallback)}</Layout></CreatorCartProvider>;}
export function CreatorSectionRenderer(props:CreatorSectionProps){const {isolated}=useContext(SiteInteractionContext);const Components={'creator-scroll-story':CreatorScrollStory,'creator-lens':CreatorLens,'creator-orbit':CreatorOrbit,'creator-remix':CreatorRemix,'creator-engagement':CreatorEngagement,'creator-journey':CreatorJourney,'creator-demo':CreatorDemoExperience,'creator-hero':CreatorHero,'creator-hero-stack':CreatorHeroStack,'creator-tools':CreatorTools,'creator-social':CreatorSocial,'creator-shop':isolated?CreatorShop:CommerceStorefront,'creator-media-kit':CreatorMediaKit,'creator-links':CreatorLinks};const Component=Components[props.section.type as keyof typeof Components];if(!Component||!props.site.modules?.creator?.enabled&&!(props.section.type==='creator-shop'&&props.site.modules?.commerce))return null;return <section id={props.section.anchor||props.section.id} data-section-id={props.section.id} data-section={props.section.id} data-section-type={props.section.type} data-ws-section-entrance={sectionEntrance(props.section.type,props.section.design.animation,props.editable)} className={`creator-section creator-section--${props.section.type}${props.selected?' is-selected':''}${!props.section.visible?' ws-section-hidden':''}`} style={creatorSectionStyle(props.section.design)} onClick={props.editable?props.onSelect:undefined} onFocusCapture={props.editable?props.onSelect:undefined}><Component {...props}/></section>;}
