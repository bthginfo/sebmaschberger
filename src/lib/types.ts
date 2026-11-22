import type {ProductGroup,TaxRule,ShippingZone} from './commerce/pricing';
import type {RouteTemplateKey} from './route-template-keys';
import type {RouteTemplate} from './route-templates';
import type { MenuPlacement, RestaurantMenu } from './restaurant-menu/model';
import type { ReservationLayout, ReservationsModule } from './reservations/model';
import type {CmsAppearance} from './cms-typefaces';
export const SECTION_TYPES = ["restaurant-menu", "reservation", "newsletter-signup", "newsletter-showcase", "assistant-showcase", "hero", "showcase-hero", "scroll-story", "scene-sequence", "workflow-demo", "project-stage", "project-index", "project-finder", "affiliate-links", "coaching-comparison", "editorial-index", "statement", "services", "team", "split", "contact", "faq", "steps", "stats", "gallery", "richtext", "cta", "cards", "list", "downloads", "quote", "logos", "video", "map", "divider", "timeline", "accordion", "notice", "announcement", "comparison", "columns", "opening-hours", "editorial-hero", "portrait-mosaic", "service-explorer", "editorial-statement", "contact-poster", "editorial-gallery", "cinematic-hero", "motion-story", "scroll-3d", "focus-finder", "portrait-rail", "stacked-panels", "kinetic-statement", "contact-dock", "blog-cards", "blog-editorial", "blog-list", "noir-hero", "case-deck", "people-index", "image-curtain", "noir-manifesto", "noir-contact", "navy-hero", "navy-bento", "navy-service-tabs", "navy-people", "navy-process", "navy-contact", "creator-hero", "creator-social", "creator-shop", "creator-tools", "creator-hero-stack", "creator-media-kit", "creator-links", "creator-demo", "creator-remix", "creator-engagement", "creator-journey", "creator-lens", "creator-orbit", "creator-scroll-story"] as const;
export const CREATOR_REMIX_MODULES = ["content", "community", "shop", "kit"] as const;
export type CreatorRemixModule = typeof CREATOR_REMIX_MODULES[number];
export const CREATOR_TOOLS = ['planner', 'campaign', 'merch', 'publishing'] as const;
export type CreatorTool = typeof CREATOR_TOOLS[number];
export type DesignVariant=1|2|3|4|5;
export type SectionType = typeof SECTION_TYPES[number];
export type ImagePosition = "0% 0%" | "50% 0%" | "100% 0%" | "0% 50%" | "50% 50%" | "100% 50%" | "0% 100%" | "50% 100%" | "100% 100%";
export interface ImageValue { srcSet?:string;sizes?:string;width?:number;height?:number;src: string; alt: string; position: ImagePosition; caption?: string }
export type CreatorHeroPreset = "gaming"|"beauty"|"fitness"|"food"|"travel"|"fashion"|"music"|"tech"|"lifestyle"|"art";
export type CreatorPlatform = "instagram"|"tiktok"|"youtube"|"twitch"|"spotify"|"discord";
export interface CommerceProduct { id:string;slug:string;title:string;description:string;titleEn?:string;descriptionEn?:string;sample?:boolean;kind:"physical"|"digital"|"service";groupId?:string;taxRuleId?:string;priceCents:number;image?:ImageValue;variants?:string[];stock?:number;active:boolean }
export interface SiteModules { consultations?:{enabled:boolean}; restaurantMenu?: RestaurantMenu; reservations?: ReservationsModule; creator?:{enabled:boolean;surface:"marketing"|"profile";demoBasePath:string};commerce?:{enabled:boolean;consumerSales?:boolean;currency:"EUR";shippingCents:number;freeShippingAboveCents?:number;products:CommerceProduct[];productGroups?:ProductGroup[];taxRules?:TaxRule[];shippingZones?:ShippingZone[]};socialStudio?:{enabled:boolean};coachStudio?:{enabled:boolean};clubManagement?:{enabled:boolean;timeZone?:string};scroll3d?:{enabled:boolean};aiAssistant?:{enabled:boolean};socialPublishing?:{enabled:boolean};proposals?:{enabled:boolean} }
export interface CreatorLensPreset { x:number;y:number;radius:number }
export interface Scroll3dChapterDesign {
  start?: number;
  layout?: "art-left" | "art-right" | "focus";
  background?: string;
  textColor?: string;
}
export interface ContentItem { appearance?: CmsAppearance; scroll3d?: Scroll3dChapterDesign; creatorTool?:CreatorTool; lens?:CreatorLensPreset; remixModule?:CreatorRemixModule;remixSelection?:CreatorRemixModule[]; platform?:CreatorPlatform;mediaUrl?:string;poster?:ImageValue;format?:"photo"|"carousel"|"reel"|"video"|"live"|"audio"|"community";placeholder?:boolean;productId?:string; id: string; title: string; text: string; image?: ImageValue; icon?: string; href?: string; label?: string; meta?: string; email?: string; phone?: string; tags?: string[]; details?: string[] }
export interface ContactFormCopy {nameLabel?:string;subjectLabel?:string;messageLabel?:string;messagePlaceholder?:string;submitLabel?:string;successHeading?:string;successText?:string;helpText?:string}
export interface SectionContent {
  restaurantMenu?: MenuPlacement;
  reservation?: { layout: ReservationLayout };
  clubFixtures?: import('./club/fixtures').ClubFixtureSource;
  creatorPartnership?: boolean;
  blogFeed?: { limit?: number; archiveLink?: boolean };
  searchTerm?: string;
  form?:ContactFormCopy;
  newsletterGroupId?:string;
  heading: string; subheading?: string; text?: string; image?: ImageValue; images?: ImageValue[]; items?: ContentItem[];
  primaryLabel?: string; primaryHref?: string; secondaryLabel?: string; secondaryHref?: string; quote?: string; attribution?: string;
  videoUrl?: string; motionModel?: string; mapAddress?: string; caption?: string;
}
export interface SectionDesign extends CmsAppearance {
  creatorHero?: CreatorHeroPreset;
  heroLayout?: "auto" | "panorama" | "split" | "portrait" | "compact" | "bento";
  scroll3dLength?: number;
  scroll3dPlayback?: "scroll" | "loop";
  motionText?: boolean;
  motionTrigger?: "loop" | "scroll";
  motionEffect?: "glaze" | "assembly" | "studio";
  theme: "light" | "dark" | "accent" | "soft"; background?: string; textColor?: string; accentColor?: string;
  headingFont: "display" | "sans"; fontScale: number; radius: number; border: number; spacing: "compact" | "normal" | "airy";
  width: "normal" | "wide" | "full"; imageSide: "left" | "right"; columns: 2 | 3 | 4; animation: "none" | "reveal" | "parallax"; align: "left" | "center";
}
export interface Section { id: string; type: SectionType; name: string; visible: boolean; anchor?: string; content: SectionContent; design: SectionDesign }
export interface PageContent { id: string; slug: string; title: string; locale: string; translationKey?: string; seo: {title: string; description: string; image?: string; noindex?: boolean}; sections: Section[] }
export interface NavItem { label: string; href: string }
export interface FooterColumn {id:string;title:string;links:NavItem[]}
export interface FooterConfig {brandText:string;ctaLabel:string;ctaHref:string;addressHeading:string;contactHeading:string;navigationHeading:string;copyright:string;showAddress:boolean;showContact:boolean;showHours:boolean;showCookieSettings:boolean;showBackToTop:boolean;columns:FooterColumn[];legalLinks:NavItem[]}
export interface BlogConfig {enabled:boolean;title:string;description:string;slug:string;layout:'cards'|'editorial'|'list';showInNavigation:boolean;navLabel:string}
export interface BlogPost {id:string;slug:string;title:string;excerpt:string;author:string;date:string;updatedAt:string;status:'draft'|'published';cover?:ImageValue;sections:Section[];seo:{title:string;description:string;image?:string;noindex?:boolean}}
export interface ColorPalette {primary:string;accent:string;background:string;text:string;surface:string;border:string}
export type SiteLanguage = "de" | "en";
export interface LocalizedSiteCopy {
  tagline: string;
  navigation: NavItem[];
  footerText: string;
  openingHours: {day: string; hours: string}[];
  footer?: FooterConfig;
  consent?: {title: string; text: string};
}
export interface LiquidGlassSettings {
  enabled: boolean;
  background: "aurora" | "space" | "none";
  intensity: number;
  speed: number;
  depth: number;
  reveal: boolean;
  feedback: boolean;
  revealDuration: number;
}
export interface SiteConfig {
  defaultAdminLanguage?: SiteLanguage;
  defaultWebsiteLanguage?: SiteLanguage;
  locales?: {en?: LocalizedSiteCopy};
  modules?: SiteModules;
  name: string; legalName: string; tagline: string; phone: string; email: string; fax: string; address: string; city: string; postalCode: string;
  navigation: NavItem[]; footerText: string; openingHours: {day: string; hours: string}[];
  theme: {primary: string; accent: string; background: string; radius: number; font: "manrope" | "dm-sans"; aesthetic?: "standard" | "liquid-glass"; glass?: LiquidGlassSettings; presentation?: "services" | "portfolio" | "consulting" | "editorial"; palettes?:Partial<Record<DesignVariant,ColorPalette>>};
  designVariant?:DesignVariant;
  consent: {enabled: boolean; title: string; text: string; english?: import("./consent/model").ConsentBannerCopy; scripts?: import("./consent/model").ConsentScript[]}; analytics: {googleId: string; matomoUrl: string; matomoSiteId: string};
  footer?:FooterConfig;blog?:BlogConfig;
}
export interface WebsiteContent { version: 1; config: SiteConfig; pages: PageContent[];posts?:BlogPost[];templates?:Partial<Record<RouteTemplateKey,RouteTemplate>> }
export interface Revision {id: string; createdAt: string; label: string; content?: WebsiteContent}
export interface CmsState {draft: WebsiteContent; published: WebsiteContent; updatedAt: string; publishedAt: string | null; revision: number; revisions: Revision[]}
export interface MediaAsset {id: string; url: string; name: string; alt: string; type: string; size: number; createdAt: string; position: ImagePosition; width?: number; height?: number}
export interface Inquiry { id: string; name: string; email: string; phone: string; subject: string; message: string; createdAt: string; status: "new" | "in-progress" | "done" | "spam"; note: string; consentAt?: string; kind?: "withdrawal" | "partnership"; proposal?: import("./proposals/model").ProposalView; emailStatus: "pending" | "sent" | "failed" | "not-configured" }
export interface SmtpSettings {host: string; port: number; secure: boolean; user: string; password?: string; passwordSet?: boolean; from: string; to: string; enabled: boolean}
export interface EmailTemplates {orderSubject?:string;orderBody?:string;refundSubject?:string;refundBody?:string;contactSubject?:string;contactBody?:string;partialRefundSubject?:string;partialRefundBody?:string}
export interface SiteSettings {emailTemplates?:EmailTemplates;smtp: SmtpSettings; retentionDays: number; onboardingComplete: boolean; siteUrl: string; storageRegion: string; databaseRegion: string}
export interface SystemStatus {database: boolean; blob: boolean; smtp: boolean; region: string; mode: "production" | "development"; initialized: boolean; launchIssues?: string[]}
export interface AdminBootstrap {state: CmsState; settings: SiteSettings; media: MediaAsset[]; inquiries: Inquiry[]; account?: {role: import("./auth-session").StaffRole; name?: string}; system: SystemStatus}
