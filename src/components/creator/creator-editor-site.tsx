"use client";
import {sectionEntrance} from "@/components/site/site-motion";
import {useContext} from "react";
import {creatorSectionStyle} from "./creator-section-style";
import {SiteInteractionContext} from "@/components/site/editable";
import {CreatorCartProvider} from './shop/cart-state';
import dynamic from 'next/dynamic';
const CreatorDemoExperience=dynamic(()=>import('./demo/creator-demo-experience').then(m=>m.CreatorDemoExperience));
const CreatorMarketingLayout=dynamic(()=>import('./marketing/creator-marketing-layout').then(m=>m.CreatorMarketingLayout));
const CreatorProfileLayout=dynamic(()=>import('./profile/creator-profile-layout').then(m=>m.CreatorProfileLayout));
const CreatorHero=dynamic(()=>import('./heroes/creator-hero').then(m=>m.CreatorHero));
const CreatorHeroStack=dynamic(()=>import('./heroes/creator-hero-stack').then(m=>m.CreatorHeroStack));
const CreatorTools=dynamic(()=>import('./tools/creator-tools').then(m=>m.CreatorTools));
const CreatorScrollStory=dynamic(()=>import('./story/creator-scroll-story').then(m=>m.CreatorScrollStory));
const CreatorLens=dynamic(()=>import('./lens/creator-lens').then(m=>m.CreatorLens));
const CreatorOrbit=dynamic(()=>import('./orbit/creator-orbit').then(m=>m.CreatorOrbit));
const CreatorRemix=dynamic(()=>import('./remix/creator-remix').then(m=>m.CreatorRemix));
const CreatorEngagement=dynamic(()=>import('./engagement/creator-engagement').then(m=>m.CreatorEngagement));
const CreatorJourney=dynamic(()=>import('./journey/creator-journey').then(m=>m.CreatorJourney));
const CreatorSocial=dynamic(()=>import('./social/creator-social').then(m=>m.CreatorSocial));
const CreatorShop=dynamic(()=>import('./shop/creator-shop').then(m=>m.CreatorShop));
const CommerceStorefront=dynamic(()=>import('./commerce-storefront').then(m=>m.CommerceStorefront));
const CreatorMediaKit=dynamic(()=>import('./profile/creator-sections').then(m=>m.CreatorMediaKit));
const CreatorLinks=dynamic(()=>import('./profile/creator-sections').then(m=>m.CreatorLinks));
import type {CreatorSectionProps} from '@/lib/creator/types';
import type {VariantSiteProps} from '../site/variants/types';
export function CreatorSite(props:VariantSiteProps){const Layout=props.site.modules?.creator?.surface==='profile'?CreatorProfileLayout:CreatorMarketingLayout;return <CreatorCartProvider site={props.site}><Layout cartHref={props.cartHref} page={props.page} site={props.site} editable={props.editable}>{props.page.sections.filter(s=>s.visible||props.editable).map(props.fallback)}</Layout></CreatorCartProvider>;}
export function CreatorSectionRenderer(props:CreatorSectionProps){const {isolated}=useContext(SiteInteractionContext);const Components={'creator-scroll-story':CreatorScrollStory,'creator-lens':CreatorLens,'creator-orbit':CreatorOrbit,'creator-remix':CreatorRemix,'creator-engagement':CreatorEngagement,'creator-journey':CreatorJourney,'creator-demo':CreatorDemoExperience,'creator-hero':CreatorHero,'creator-hero-stack':CreatorHeroStack,'creator-tools':CreatorTools,'creator-social':CreatorSocial,'creator-shop':isolated?CreatorShop:CommerceStorefront,'creator-media-kit':CreatorMediaKit,'creator-links':CreatorLinks};const Component=Components[props.section.type as keyof typeof Components];if(!Component||!props.site.modules?.creator?.enabled&&!(props.section.type==='creator-shop'&&props.site.modules?.commerce))return null;return <section id={props.section.anchor||props.section.id} data-section-id={props.section.id} data-section={props.section.id} data-section-type={props.section.type} data-ws-section-entrance={sectionEntrance(props.section.type,props.section.design.animation,props.editable)} className={`creator-section creator-section--${props.section.type}${props.selected?' is-selected':''}${!props.section.visible?' ws-section-hidden':''}`} style={creatorSectionStyle(props.section.design)} onClick={props.editable?props.onSelect:undefined} onFocusCapture={props.editable?props.onSelect:undefined}><Component {...props}/></section>;}
