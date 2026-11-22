"use client";

import { collectionColumns } from "@/lib/collection-editing";
import { useId } from "react";
import { cmsAppearanceCss } from "@/lib/cms-appearance";
import { useAdminLanguage } from "@/components/admin/admin-language";

import dynamic from "next/dynamic";
import {CreatorCartProvider} from "@/components/creator/shop/cart-state";
import type {CreatorSectionProps} from "@/lib/creator/types";
import { RestaurantMenu } from "./restaurant-menu";
import { ReservationWidget } from "./reservation-widget";
import type { MenuSelection } from "@/lib/restaurant-menu/model";
import reservationStyles from "./reservation-widget.module.css";
import type {VariantSiteProps} from "./variants/types";
import { useGalleryLightbox } from './gallery-lightbox';

import { useContext, useEffect, useRef, useState, type ComponentType, type CSSProperties, type ReactNode } from "react";
import { ArrowDown, ArrowDownToLine, ArrowLeft, ArrowRight, ArrowUp, ArrowUpRight, BriefcaseBusiness, Droplets, ShoppingBag, Building2, CalendarDays, Check, ChevronDown, Clock3, FileText, HeartHandshake, House, Info, Mail, MapPin, Menu, Minus, Phone, Plus, ShieldCheck, UsersRound, X } from "lucide-react";
import type { ContentItem, ImageValue, MediaAsset, PageContent, Section, SectionContent, SiteConfig, SiteLanguage } from "@/lib/types";
import { NewsletterSignup } from "./newsletter-signup";
import { NewsletterShowcase } from "./newsletter-showcase";
import { ContactForm } from "./contact-form";
import { ConsentManager, consentEvent, ExternalMedia, type PublishedConsent } from "./consent";
import { ContentDisclosure, ContentLink, EditableImage, EditableText, safeHref, SiteInteractionContext, SiteMediaContext, teamEmailLabel } from "./editable";
import { languageForSlug, localizedSite, type TranslationSlugs } from "@/lib/site-languages";
import { footerConfig, copyrightText } from "@/lib/site-config";
import { FooterLegalLinks, FooterNavigation } from "./footer-navigation";
import { EditorialSection, EditorialSite } from "./variants/editorial";
import { ImmersiveSection, ImmersiveSite } from "./variants/immersive";
import { PanoramaHero, PanoramaServices } from "./variants/panorama";
import { BlogFeed } from "./blog-feed";
import { NoirSection, NoirSite } from "./variants/noir";
import { NavySection, NavySite } from "./variants/navy";
import { ContentIcon } from "./content-icon";
import { PageHeadingProvider, SectionHeadingProvider, useSectionHeadingLevel } from "./heading-level";
import { DesignReviewSwitcher, useDesignVariant, type DesignVariant } from "./preview-switcher";
import { liquidGlassSettings } from '@/lib/liquid-glass.mjs';
import { paletteFor } from "@/lib/theme";
import { useSmartHeader } from "./smart-header";
import { installSiteMotion, sectionEntrance } from "./site-motion";
import { HeroComposition } from "./variants/hero-compositions";
import { clubTimelineItems, type PublicClubMatch } from "@/lib/club/fixtures";
import { ProjectIndex, ProjectStage, SceneSequence, ScrollStory, WorkflowDemo } from "./visual-sections";
import { projectBrand } from "@/lib/project-brand";
import { ProjectFinder } from "./project-finder";
import { CoachingComparison } from "./coaching-comparison";
const AssistantShowcase=dynamic(()=>import("@/components/assistant/assistant-showcase").then(module=>module.AssistantShowcase));
const LiquidGlassLayer = dynamic(() => import("./liquid-glass").then(module => module.LiquidGlassLayer));
const MotionStory = dynamic(() => import("./motion-story").then(module => module.MotionStory));
const Scroll3d = dynamic(() => import("./scroll-3d").then(module => module.Scroll3d));
const CreatorSite=dynamic(()=>import("@/components/creator/creator-editor-site").then(module=>module.CreatorSite));
const CreatorSectionRenderer=dynamic(()=>import("@/components/creator/creator-editor-site").then(module=>module.CreatorSectionRenderer));

export interface SiteViewProps {
  cartHref?:string;
  consent?: PublishedConsent;
  translations?: TranslationSlugs;
  creatorComponents?:{site:ComponentType<VariantSiteProps>;section:ComponentType<CreatorSectionProps>};
  page: PageContent;
  site: SiteConfig;
  editable?: boolean;
  variant?: DesignVariant;
  media?: MediaAsset[];
  selectedSectionId?: string;
  readOnlySectionIds?: readonly string[];
  onSectionSelect?: (id: string) => void;
  onSectionChange?: (section: Section) => void;
  onEditMenu?: (selection: MenuSelection) => void;
}

export function SiteView(props:SiteViewProps){return !props.site.modules?.creator?.enabled&&props.site.modules?.commerce?<CreatorCartProvider site={props.site}><SiteViewBody {...props}/></CreatorCartProvider>:<SiteViewBody {...props}/>;}
function SiteViewBody({ cartHref, consent, creatorComponents, page: authoredPage, site: baseSite, translations, editable = false, selectedSectionId, readOnlySectionIds, onSectionSelect, onSectionChange: updateAuthoredSection, onEditMenu, variant, media }: SiteViewProps) {
  const { t: adminText } = useAdminLanguage();
  const language = languageForSlug(authoredPage.slug);
  const site = localizedSite(baseSite, language);
  const club = baseSite.modules?.clubManagement;
  const livePreview = editable && club?.enabled === true && authoredPage.sections.some(section => section.type === "timeline" && section.content.clubFixtures);
  const [clubFixtures, setClubFixtures] = useState<PublicClubMatch[]>();
  useEffect(() => {
    if (!livePreview) return;
    const request = new AbortController();
    fetch("/api/club/fixtures", { cache: "no-store", signal: request.signal }).then(async response => {
      if (response.ok) {
        const payload = await response.json() as { fixtures?: PublicClubMatch[] };
        if (Array.isArray(payload.fixtures) && !request.signal.aborted) setClubFixtures(payload.fixtures);
      }
    }).catch(() => {});
    return () => request.abort();
  }, [livePreview]);
  const previewPage = livePreview && clubFixtures ? { ...authoredPage, sections: authoredPage.sections.map(section =>
    section.type === "timeline" && section.content.clubFixtures ? {
      ...section, content: { ...section.content, items: clubTimelineItems(clubFixtures, section.content.clubFixtures, language, Date.now(), club?.timeZone) },
    } : section,
  ) } : authoredPage;
  const page = editable ? previewPage : {
    ...previewPage,
    sections: previewPage.sections.filter(section => {
      if (section.type === "scroll-3d") return site.modules?.scroll3d?.enabled === true;
      if (section.type === "restaurant-menu") return site.modules?.restaurantMenu?.enabled === true;
      if (section.type === "reservation") return site.modules?.reservations?.enabled === true;
      return true;
    }),
  };
  const onSectionChange = updateAuthoredSection && ((section: Section) => {
    const original = livePreview && clubFixtures && authoredPage.sections.find(item => item.id === section.id && item.content.clubFixtures);
    updateAuthoredSection(original ? { ...section, content: { ...section.content, items: original.content.items } } : section);
  });
  const Main = editable ? "div" : "main";
  const rootRef = useRef<HTMLDivElement>(null);
  const [activeVariant, changeVariant] = useDesignVariant(variant, editable, site.designVariant);
  const glass = site.theme.aesthetic === "liquid-glass" && activeVariant === 1;
  const glassSettings = liquidGlassSettings(site.theme.glass);
  useEffect(() => {
    if (editable) return;
    const root = rootRef.current;
    if (!root) return;
    const stopMotion = !glass || glassSettings.enabled && glassSettings.reveal ? installSiteMotion(root) : undefined;
    const scrollToAnchor = (event: MouseEvent) => {
      const link = (event.target as HTMLElement).closest<HTMLAnchorElement>('a[href^="#"]');
      if (!link || link.hash.length < 2) return;
      const target = document.getElementById(decodeURIComponent(link.hash.slice(1)));
      if (!target || !root.contains(target)) return;
      event.preventDefault();
      const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
      if (link.hash === "#hauptinhalt" && link.closest("footer")) window.scrollTo({ top: 0, behavior });
      else target.scrollIntoView({ behavior, block: "start" });
      if (target.hasAttribute("tabindex")) target.focus({ preventScroll: true });
    };
    root.addEventListener("click", scrollToAnchor);
    return () => { stopMotion?.(); root.removeEventListener("click", scrollToAnchor); };
  }, [page.id, editable, activeVariant, glass, glassSettings.enabled, glassSettings.reveal]);
  const palette = paletteFor(site, activeVariant);
  const paletteOverride = Boolean(site.theme.palettes?.[activeVariant]);
  const appearanceId = useId();
  const appearance = cmsAppearanceCss(appearanceId, page.sections);
  const siteStyle = {
    "--ws-ink": activeVariant === 1 ? palette.primary : site.theme.primary, "--ws-accent": activeVariant === 1 ? palette.accent : site.theme.accent,
    "--ws-paper": activeVariant === 1 ? palette.background : site.theme.background, "--ws-radius": `${site.theme.radius}px`,
    "--font-body": site.theme.font === "manrope" ? "'Manrope Variable', 'Manrope', sans-serif" : "'DM Sans Variable', 'DM Sans', sans-serif",
    "--ws-display": site.theme.font === "dm-sans" ? "var(--font-body)" : "var(--font-display)",
    ...(glass ? { "--lg-intensity": String(0.25 + glassSettings.intensity / 100), "--lg-ambient-duration": `${100 - glassSettings.speed * 0.5}s`, "--lg-reveal-duration": `${glassSettings.revealDuration}ms` } : {}),
    ...(paletteOverride ? { "--ws-palette-primary": palette.primary, "--ws-palette-accent": palette.accent, "--ws-palette-background": palette.background, "--ws-palette-text": palette.text, "--ws-palette-surface": palette.surface, "--ws-palette-border": palette.border } : {}),
  } as CSSProperties;
  const portraits = page.sections.filter((section) => section.visible && ["team", "portrait-mosaic", "portrait-rail", "people-index", "navy-people"].includes(section.type)).flatMap((section) => section.content.items ?? []);
  const sceneImage = page.sections.find((section) => section.visible && section.type === "split" && section.content.image)?.content.image ?? page.sections.find((section) => section.visible && section.content.image)?.content.image;
  const firstHeadingId = page.sections.find((section) => section.visible && section.content.heading.trim() && (!section.type.startsWith("blog-") || (site.blog?.enabled && (section.id === "blog-feed" || section.content.items?.length))))?.id ?? null;
  const PublicCreatorSection=creatorComponents?.section;
  const CreatorLayout=creatorComponents?.site||CreatorSite;
  const fallback = (section: Section) => <SectionHeadingProvider key={section.id} sectionId={section.id}>{PublicCreatorSection&&section.type.startsWith("creator-")?<PublicCreatorSection section={section} site={site} editable={editable} selected={selectedSectionId === section.id} onSelect={() => onSectionSelect?.(section.id)} onChange={onSectionChange}/>:<SectionRenderer glass={glass} section={section} site={site} language={language} editable={editable} selected={selectedSectionId === section.id} onSelect={() => onSectionSelect?.(section.id)} onChange={onSectionChange} onEditMenu={onEditMenu} portraits={portraits} sceneImage={sceneImage} />}</SectionHeadingProvider>;
  const variantProps = { page, site, cartHref, editable, selectedSectionId, onSectionSelect, onSectionChange, fallback };
  const languageLinks = !editable && translations?.de !== undefined && translations?.en !== undefined
    ? <nav className="ws-language-switch" aria-label={language === "en" ? "Website language" : "Sprache der Website"}>
        {(["de", "en"] as const).map(code => <a key={code} href={"/" + translations[code]} hrefLang={code} lang={code}
          aria-current={language === code ? "page" : undefined} aria-label={code === "en" ? "English" : "Deutsch"}>{code.toUpperCase()}</a>)}
      </nav>
    : null;
  if(site.modules?.creator?.enabled)return <SiteMediaContext.Provider value={media}><PageHeadingProvider firstSectionId={firstHeadingId} readOnlySectionIds={readOnlySectionIds}><div ref={rootRef} className={`ws-site creator-site${editable?' ws-site-editable':''}`} lang={language} data-cms-style-scope={appearanceId} style={siteStyle}>{appearance && <style>{appearance}</style>}{languageLinks}<CreatorLayout {...variantProps}/>{!editable&&<ConsentManager site={baseSite} language={language} published={consent} />}</div></PageHeadingProvider></SiteMediaContext.Provider>;
  return <SiteMediaContext.Provider value={media}><PageHeadingProvider firstSectionId={firstHeadingId} readOnlySectionIds={readOnlySectionIds}><div ref={rootRef} className={`ws-site ws-design-${activeVariant}${editable ? " ws-site-editable" : ""}`} lang={language} data-site-aesthetic={glass ? "liquid-glass" : undefined} data-glass-motion={glass ? glassSettings.enabled ? "on" : "off" : undefined} data-glass-feedback={glass ? String(glassSettings.enabled && glassSettings.feedback && !editable) : undefined} data-project={projectBrand} data-page-key={page.translationKey} data-design-version={activeVariant} data-presentation={activeVariant === 1 ? site.theme.presentation : undefined} data-cms-style-scope={appearanceId} style={siteStyle}>{appearance && <style>{appearance}</style>}
    {glass && <LiquidGlassLayer settings={glassSettings} editable={editable} language={language} />}
    {!editable && <a className="ws-skip-link" href="#hauptinhalt">{language === "en" ? "Skip to content" : "Zum Inhalt springen"}</a>}
    {activeVariant !== 1 && languageLinks}
    {activeVariant === 2 ? <EditorialSite {...variantProps} /> : activeVariant === 3 ? <ImmersiveSite {...variantProps} /> : activeVariant === 4 ? <NoirSite {...variantProps} /> : activeVariant === 5 ? <NavySite {...variantProps} /> : <>
    <SiteHeader site={site} editable={editable} currentSlug={page.slug} language={language} languageLinks={languageLinks} />
    <Main data-site-main={editable ? "" : undefined} role={editable ? "region" : undefined} aria-label={editable ? adminText("Seitenvorschau: {page}", { page: page.title }) : undefined} id="hauptinhalt" tabIndex={editable ? undefined : -1}>
      {page.sections.filter((section) => section.visible || editable).map(fallback)}
      {editable && page.sections.length === 0 && <div className="ws-empty-page"><Plus size={32} /><p>{adminText("Diese Seite wartet auf ihren ersten Abschnitt.")}</p><span>{adminText("Wählen Sie einen Abschnitt aus der Bibliothek.")}</span></div>}
    </Main>
    <SiteFooter site={site} editable={editable} language={language} />
    </>}
    {!editable && <ConsentManager site={baseSite} language={language} published={consent} />}
    {!editable && process.env.NEXT_PUBLIC_SHOW_LAYOUT_EXPLORER === "1" && <DesignReviewSwitcher variant={activeVariant} onChange={changeVariant} />}
  </div></PageHeadingProvider></SiteMediaContext.Provider>;
}

function SiteHeader({ site, editable, currentSlug, language, languageLinks }: { site: SiteConfig; editable?: boolean; currentSlug: string; language: SiteLanguage; languageLinks: ReactNode }) {
  const [open, setOpen] = useState(false);
  const smartHeader = useSmartHeader({ open, disabled: editable });
  const menuRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const contact = site.navigation.find((item) => /\/(?:kontakt|contact)$/.test(item.href));
  useEffect(() => {
    if (!open) return;
    const handleKey = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); toggleRef.current?.focus(); } };
    const outside = (event: PointerEvent) => { if (!menuRef.current?.contains(event.target as Node) && !toggleRef.current?.contains(event.target as Node)) setOpen(false); };
    window.addEventListener("keydown", handleKey); window.addEventListener("pointerdown", outside);
    return () => { window.removeEventListener("keydown", handleKey); window.removeEventListener("pointerdown", outside); };
  }, [open]);
  return <header {...smartHeader} className="ws-header">
    <div className="ws-header-inner"><ContentLink href={language === "en" ? "/en" : "/"} editable={editable} className="ws-brand"><span className={projectBrand === "coaching" ? "seb-mark seb-original-mark" : "seb-mark"} aria-hidden="true">
        {projectBrand === "coaching" ? <img src="/media/project/sebastian-logo.svg" alt="" width={56} height={23} /> : <Droplets size={20} />}
      </span><span className="seb-brand-copy"><span className="ws-brand-name">{site.name}</span><span className="ws-brand-subline">{site.tagline}</span></span></ContentLink>
      <nav className="ws-desktop-nav" aria-label={language === "en" ? "Main navigation" : "Hauptnavigation"}>{site.navigation.filter((item) => item !== contact).map((item) => <ContentLink key={item.href} href={item.href} editable={editable} className={currentSlug && item.href === `/${currentSlug}` ? "is-current" : ""}>{item.label}</ContentLink>)}</nav>
      <div className="ws-header-actions">{languageLinks}{site.modules?.commerce?.enabled && <ContentLink href={language === "en" ? "/en/cart" : "/warenkorb"} editable={editable} className="seb-cart-link" label={language === "en" ? "Cart" : "Warenkorb"}><ShoppingBag size={18} aria-hidden="true" /></ContentLink>}{contact && <ContentLink href={contact.href} editable={editable} className="ws-header-contact">{contact.label}<ArrowUpRight size={18} /></ContentLink>}
        <button ref={toggleRef} className="ws-menu-toggle" type="button" aria-label={language === "en" ? open ? "Close menu" : "Open menu" : open ? "Menü schließen" : "Menü öffnen"} aria-expanded={open} aria-controls="ws-mobile-menu" onClick={() => setOpen(!open)}>{open ? <X size={25} /> : <Menu size={25} />}</button></div>
    </div>
    <div ref={menuRef} id="ws-mobile-menu" className={`ws-mobile-menu${open ? " is-open" : ""}`} inert={!open}>
      <nav aria-label={language === "en" ? "Mobile navigation" : "Mobile Hauptnavigation"}>{site.navigation.map((item) => <a key={item.href} href={safeHref(item.href)} aria-current={item.href === `/${currentSlug}` ? "page" : undefined} onClick={(event) => { if (editable) event.preventDefault(); setOpen(false); }}>{item.label}<ArrowUpRight size={23} /></a>)}</nav>
      {site.phone && <a className="ws-mobile-phone" href={`tel:${site.phone.replace(/[^+\d]/g, "")}`} onClick={editable ? (event) => event.preventDefault() : undefined}><Phone size={18} />{site.phone}</a>}
    </div>
  </header>;
}

function SiteFooter({ site, editable, language }: { site: SiteConfig; editable?: boolean; language: SiteLanguage }) {
  const footer = footerConfig(site);
  return <footer className="ws-footer">
    {(footer.brandText || footer.ctaLabel) && <div className="ws-footer-top">{footer.brandText && <ContentLink href="/" editable={editable} className="ws-footer-brand">{projectBrand === "coaching" && <span className="seb-footer-mark"><img src="/media/project/sebastian-logo.svg" alt="" width={80} height={32} loading="lazy" /></span>}{footer.brandText}</ContentLink>}{footer.ctaLabel && <ContentLink href={footer.ctaHref} editable={editable} className="ws-footer-contact-link">{footer.ctaLabel}<ArrowUpRight size={32} /></ContentLink>}</div>}
    <div className="ws-footer-grid" style={{ "--footer-area-count": 1 + Number(footer.showAddress) + Number(footer.showContact || footer.showHours) + Number(footer.columns.length > 0) } as CSSProperties}><div className="ws-footer-intro"><p>{site.footerText}</p><p className="ws-footer-legal-name">{site.legalName}</p></div>
      {footer.showAddress && <div>{footer.addressHeading && <h2>{footer.addressHeading}</h2>}<address>{site.address}<br />{site.postalCode} {site.city}</address></div>}
      {(footer.showContact || footer.showHours) && <div>{footer.contactHeading && <h2>{footer.contactHeading}</h2>}{footer.showContact && <><ContentLink href={`tel:${site.phone.replace(/[^+\d]/g, "")}`} editable={editable}>{site.phone}</ContentLink><ContentLink href={`mailto:${site.email}`} editable={editable}>{site.email}</ContentLink></>}{footer.showHours && site.openingHours.map((entry) => <p className="ws-footer-hours" key={entry.day}><span>{entry.day}</span><span>{entry.hours}</span></p>)}</div>}
      <FooterNavigation site={site} editable={editable} />
    </div>
    <div className="ws-footer-bottom"><span>{copyrightText(site)}</span><div><FooterLegalLinks site={site} editable={editable} />{site.consent.enabled && footer.showCookieSettings && <button type="button" onClick={() => { if (!editable) window.dispatchEvent(new Event(consentEvent)); }}>{language === "en" ? "Cookie settings" : "Cookie-Einstellungen"}</button>}</div>{footer.showBackToTop && <a href="#hauptinhalt" className="ws-back-top" aria-label="Zum Seitenanfang"><ArrowUp size={18} /></a>}</div>
  </footer>;
}

type RendererProps = { glass?: boolean; section: Section; site: SiteConfig; language?: SiteLanguage; editable?: boolean; selected?: boolean; onSelect?: () => void; onChange?: (section: Section) => void; portraits?: ContentItem[]; sceneImage?: ImageValue; onEditMenu?: (selection: MenuSelection) => void };
type SectionStyle = CSSProperties & Record<`--${string}`, string | number>;

export function SectionRenderer({ section, site, language = "de", editable = false, selected, onSelect, onChange, portraits, sceneImage, onEditMenu, glass = false }: RendererProps) {
  const { t: adminText } = useAdminLanguage();
  const { content: c, design: d } = section;
  const teamGridRef = useRef<HTMLDivElement>(null);
  const [teamIndex, setTeamIndex] = useState(0);
  const headingLevel = useSectionHeadingLevel(section.id);
  const {isolated} = useContext(SiteInteractionContext);
  const gallery = useGalleryLightbox(c.images ?? []);
  if (section.type === "restaurant-menu" && !editable && !site.modules?.restaurantMenu?.enabled) return null;
  if (section.type === "reservation" && !editable && !site.modules?.reservations?.enabled) return null;
  if (section.type === "scroll-3d" && !editable && !site.modules?.scroll3d?.enabled) return null;
  if(section.type==="assistant-showcase")return <AssistantShowcase section={section} site={site} editable={editable} selected={selected} onSelect={onSelect} onChange={onChange}/>;
  if(section.type.startsWith("creator-"))return <CreatorSectionRenderer section={section} site={site} editable={editable} selected={selected} onSelect={onSelect} onChange={onChange}/>;
  if (["blog-cards", "blog-editorial", "blog-list"].includes(section.type)) return <BlogFeed section={section} site={site} editable={editable} selected={selected} onSelect={onSelect} onChange={onChange} />;
  if (["navy-hero", "navy-bento", "navy-service-tabs", "navy-people", "navy-process", "navy-contact"].includes(section.type)) return <NavySection section={section} site={site} editable={editable} selected={selected} onSelect={onSelect} onChange={onChange} portraits={portraits} sceneImage={sceneImage} />;
  if (["noir-hero", "case-deck", "people-index", "image-curtain", "noir-manifesto", "noir-contact"].includes(section.type)) return <NoirSection section={section} site={site} editable={editable} selected={selected} onSelect={onSelect} onChange={onChange} portraits={portraits} />;
  if (["editorial-hero", "portrait-mosaic", "service-explorer", "editorial-statement", "contact-poster", "editorial-gallery"].includes(section.type)) return <EditorialSection section={section} site={site} editable={editable} selected={selected} onSelect={onSelect} onChange={onChange} />;
  if (["cinematic-hero", "focus-finder", "portrait-rail", "stacked-panels", "kinetic-statement", "contact-dock"].includes(section.type)) return <ImmersiveSection section={section} site={site} editable={editable} selected={selected} onSelect={onSelect} onChange={onChange} />;
  const update = <K extends keyof SectionContent>(key: K, value: SectionContent[K]) => onChange?.({ ...section, content: { ...c, [key]: value } });
  const updateItem = <K extends keyof ContentItem>(index: number, key: K, value: ContentItem[K]) => update("items", (c.items ?? []).map((item, i) => i === index ? { ...item, [key]: value } : item));
  const text = (key: "heading" | "subheading" | "text" | "quote" | "attribution" | "caption", as: "h1" | "h2" | "h3" | "p" | "div" | "span" | "blockquote" = "p", className = "") => <EditableText as={key === "heading" ? headingLevel : as} value={c[key]} editable={editable} className={className} onChange={(value) => update(key, value)} label={`${key === "heading" ? "Überschrift" : "Text"} bearbeiten`} />;
  const heading = (className = "ws-section-heading") => text("heading", section.type === "hero" ? "h1" : "h2", className);
  const itemText = (item: ContentItem, index: number, key: "title" | "text" | "label" | "meta", as: "h3" | "p" | "span" = "p", className = "") => <EditableText as={as} value={item[key]} editable={editable} onChange={(value) => updateItem(index, key, value)} className={className} />;
  const image = (className = "", priority = false) => <EditableImage image={c.image} editable={editable} onChange={(value) => update("image", value)} className={className} priority={priority} />;
  const itemImage = (item: ContentItem, index: number, className = "") => <EditableImage image={item.image} editable={editable} onChange={(value) => updateItem(index, "image", value)} className={className} />;
  const actions = (className = "") => c.primaryLabel || c.secondaryLabel || editable ? <div className={`ws-actions ${className}`}>
    {(c.primaryLabel || editable) && <ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} className="ws-button ws-button-primary"><EditableText as="span" value={c.primaryLabel} editable={editable} onChange={(value) => update("primaryLabel", value)} /><ArrowUpRight size={20} /></ContentLink>}
    {c.secondaryLabel && <ContentLink href={c.secondaryHref} editField="secondaryHref" editable={editable} className="ws-text-button"><EditableText as="span" value={c.secondaryLabel} editable={editable} onChange={(value) => update("secondaryLabel", value)} /><ArrowRight size={18} /></ContentLink>}
  </div> : null;
  const intro = (className = "") => <div className={`ws-section-intro ${className}`}><div>{heading()}{c.subheading && text("subheading", "p", "ws-section-subheading")}</div>{c.text && text("text", "p", "ws-section-text")}</div>;
  const items = c.items ?? [];
  const details = (item: ContentItem, index: number) => item.details?.length ? <ul className="ws-detail-list">{item.details.map((detail, detailIndex) => <li key={detailIndex}><Check size={16} /><EditableText as="span" value={detail} editable={editable} onChange={(value) => updateItem(index, "details", item.details!.map((entry, entryIndex) => entryIndex === detailIndex ? value : entry))} /></li>)}</ul> : null;
  const themeDefaults = glass ? { background: d.theme === "accent" ? "color-mix(in srgb, var(--ws-accent) 5%, transparent)" : "transparent", color: "var(--ws-palette-text, var(--ws-ink))" } : d.theme === "dark" ? { background: "var(--ws-ink)", color: "var(--ws-paper)" } : d.theme === "accent" ? { background: "var(--ws-accent)", color: "var(--ws-ink)" } : d.theme === "soft" ? { background: "var(--ws-palette-surface, #e8ece4)", color: "var(--ws-palette-text, var(--ws-ink))" } : { background: "var(--ws-paper)", color: "var(--ws-palette-text, var(--ws-ink))" };
  const style: SectionStyle = {
    ...(glass && d.cardBackground ? { "--lg-surface": d.cardBackground } : {}),
    "--section-bg": d.background || themeDefaults.background, "--section-fg": d.textColor || themeDefaults.color,
    "--section-accent": d.accentColor || "var(--ws-accent)", "--section-scale": d.fontScale,
    "--section-radius": `${d.radius}px`, "--section-columns": collectionColumns(d.columns, c.items?.length ?? 0),
    "--section-heading-font": d.headingFont === "sans" ? "var(--font-body)" : section.type === "showcase-hero" && d.heroLayout === "portrait" ? "var(--font-editorial)" : "var(--ws-display)",
    borderWidth: d.border ? `${d.border}px` : undefined,
  };
  let body: ReactNode;
  switch (section.type) {
    case "restaurant-menu": body = <RestaurantMenu section={section} menu={site.modules?.restaurantMenu} language={language} editable={editable} onChange={onChange} onEditMenu={onEditMenu} />; break;
    case "reservation": {
      const layout = c.reservation?.layout ?? "card";
      const hasImage = layout === "split" && (Boolean(c.image?.src) || editable);
      body = <div className={`ws-reservation-placement ${reservationStyles.placement}`} data-layout={layout} data-has-image={hasImage ? "" : undefined}>
        <div className={reservationStyles.placementIntro}>
          {c.subheading && text("subheading", "p", "ws-visual-label")}
          {heading()}
          {c.text && text("text", "p", "ws-section-text")}
          {hasImage && image(reservationStyles.placementImage)}
        </div>
        <ReservationWidget layout={layout} language={language} editable={editable} />
      </div>;
      break;
    }
    case "newsletter-signup": body = <>{intro()}<NewsletterSignup label={c.primaryLabel||"Anmelden"} groupId={c.newsletterGroupId} preview={editable||isolated}/></>; break;
    case "newsletter-showcase": body = <>{intro()}<NewsletterShowcase creators={site.modules?.creator?.enabled===true}/></>; break;
    case "motion-story": body = <MotionStory section={section} editable={editable} onChange={onChange}
      actions={c.primaryLabel || c.secondaryLabel ? actions() : undefined} />; break;
    case "scroll-3d": body = <Scroll3d section={section} language={language} editable={editable}
      enabled={site.modules?.scroll3d?.enabled === true} onChange={onChange}
      actions={c.primaryLabel || c.secondaryLabel ? actions() : undefined} />; break;
    case "showcase-hero": {
      const layout = d.heroLayout === "panorama" || d.heroLayout === "portrait" ? d.heroLayout : "split";
      body = <div className="ws-showcase-hero" data-layout={layout} data-image-side={d.imageSide}
        data-ws-reveal={!editable && d.animation !== "none" ? "" : undefined}>
        <div className="ws-showcase-copy">
          {text("subheading", "p", "ws-visual-label")}
          {heading("ws-showcase-title")}
          {glass ? <div className="ws-glass-copy-panel">{text("text", "p", "ws-showcase-lead")}{actions()}</div> : <>{text("text", "p", "ws-showcase-lead")}{actions()}</>}
        </div>
        {(c.image?.src || editable) && <figure className="ws-showcase-art">
          <EditableImage image={c.image} editable={editable} onChange={value => update("image", value)}
            className="ws-showcase-image" priority={headingLevel === "h1"}
            sizes={layout === "panorama" ? "(max-width: 1500px) 92vw, 1424px" : "(max-width: 860px) 90vw, (max-width: 1550px) 52vw, 780px"} />
          <EditableText as="figcaption" value={c.caption} editable={editable}
            onChange={value => update("caption", value)} className="ws-visual-caption" />
        </figure>}
      </div>;
      break;
    }
    case "scroll-story":
    case "scene-sequence":
    case "workflow-demo":
    case "project-index":
    case "project-finder":
    case "editorial-index":
    case "project-stage": {
      const itemLink = (item: ContentItem) => item.href && <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} className="ws-inline-link">
        {item.label || (language === "en" ? "Learn more" : "Mehr erfahren")}<ArrowUpRight size={17} />
      </ContentLink>;
      const galleryProps = {
        items,
        editable,
        language,
        media: (item: ContentItem, index: number) => item.image?.src || editable ? (
          <EditableImage image={item.image} editable={editable} onChange={value => updateItem(index, "image", value)}
            className="ws-visual-image" sizes={section.type === "editorial-index" ? "(max-width: 350px) 75vw, 256px" : "(max-width: 860px) 90vw, (max-width: 1550px) 52vw, 780px"} />
        ) : null,
        copy: (item: ContentItem, index: number) => <>
          {itemText(item, index, "meta", "p", "ws-visual-label")}
          {itemText(item, index, "title", "h3", "ws-visual-title")}
          {itemText(item, index, "text", "p", "ws-visual-text")}
          {details(item, index)}
          {itemLink(item)}
        </>,
      };
      let feature: ReactNode = null;
      switch (section.type) {
        case "scroll-story":
          feature = <ScrollStory {...galleryProps} motion={d.animation !== "none"} />;
          break;
        case "scene-sequence":
          feature = <SceneSequence {...galleryProps} motion={d.animation !== "none"} />;
          break;
        case "workflow-demo":
          feature = <WorkflowDemo {...galleryProps} motion={d.animation !== "none"} />;
          break;
        case "project-stage":
          feature = <ProjectStage {...galleryProps} />;
          break;
        case "project-finder":
          feature = <ProjectFinder {...galleryProps} brand={projectBrand} />;
          break;
        case "project-index":
          feature = <ProjectIndex {...galleryProps} />;
          break;
        case "editorial-index":
          feature = <ul className="ws-editorial-index">{items.map((item, index) =>
            <li key={item.id} data-item-id={item.id} className="ws-editorial-entry ws-section-entrance"
              data-ws-reveal={!editable && d.animation !== "none" ? "" : undefined}>
              <div className="ws-editorial-entry-title">
                {itemText(item, index, "meta", "p", "ws-visual-label")}
                {itemText(item, index, "title", "h3", "ws-visual-title")}
              </div>
              <div className="ws-editorial-entry-copy">
                {itemText(item, index, "text", "p", "ws-visual-text")}
                {details(item, index)}
                {itemLink(item)}
              </div>
              {(item.image?.src || editable) && <div className="ws-editorial-entry-media">{galleryProps.media(item, index)}</div>}
            </li>)}</ul>;
          break;
      }
      body = <div className="ws-visual-section" data-image-side={d.imageSide}>
        <div className="ws-section-entrance" data-ws-reveal={!editable && d.animation !== "none" ? "" : undefined}>{intro()}</div>
        {feature}
        {actions("ws-section-bottom-actions")}
      </div>;
      break;
    }
    case "hero": body = d.heroLayout && d.heroLayout !== "auto" ? <HeroComposition world={1} layout={d.heroLayout} section={section} site={site} editable={editable} onChange={onChange} portraits={portraits} /> : d.theme === "dark" ? <div className="ws-hero-immersed">{image("ws-hero-immersed-image", true)}<div className="ws-hero-overlay"><span className="ws-hero-location"><MapPin size={15} />{site.city}</span><div>{heading("ws-hero-heading")}{c.subheading && text("subheading", "p", "ws-hero-subheading")}</div><div className="ws-hero-overlay-bottom">{c.text && text("text", "p", "ws-hero-text")}{actions()}</div></div></div>
      : d.imageSide === "left" ? <div className="ws-hero-portrait-layout"><div className="ws-hero-portrait-media">{image("ws-hero-portrait-image", true)}{c.caption && text("caption", "p", "ws-hero-portrait-caption")}</div><div className="ws-hero-portrait-copy">{heading("ws-hero-heading")}{c.subheading && text("subheading", "p", "ws-hero-subheading")}<div className="ws-hero-portrait-note">{text("text", "p", "ws-hero-text")}{actions()}</div></div></div>
      : <PanoramaHero section={section} site={site} editable={editable} onChange={onChange} portraits={portraits} />; break;
    case "statement": body = <div className="ws-statement-layout">{heading("ws-statement-heading")}<div className="ws-statement-aside">{text("text", "p", "ws-statement-text")}{actions()}</div></div>; break;
    case "services": body = <PanoramaServices section={section} site={site} editable={editable} onChange={onChange} sceneImage={sceneImage} />; break;
    case "team": body = <>{intro()}{items.length === 3 && <div className="ws-team-controls" aria-label="Team durchblättern"><span aria-live="polite">{teamIndex + 1} / {items.length}</span><button type="button" aria-label="Vorherige Person" disabled={teamIndex === 0} onClick={() => teamGridRef.current?.scrollBy({ left: -(teamGridRef.current.clientWidth * .83 + 18), behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}><ArrowLeft size={18} /></button><button type="button" aria-label="Nächste Person" disabled={teamIndex === items.length - 1} onClick={() => teamGridRef.current?.scrollBy({ left: teamGridRef.current.clientWidth * .83 + 18, behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" })}><ArrowRight size={18} /></button></div>}<div className="ws-team-grid" data-count={items.length} ref={teamGridRef} onScroll={(event) => {
      const grid = event.currentTarget;
      const card = grid.firstElementChild;
      if (card) setTeamIndex(Math.min(items.length - 1, Math.max(0, Math.round(grid.scrollLeft / (card.clientWidth + 18)))));
    }}>{items.map((item, index) => <article className="ws-person" key={item.id} data-item-id={item.id}>
      {itemImage(item, index, "ws-person-photo")}<div className="ws-person-name">{item.href ? <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable}>{itemText(item, index, "title", "h3")}<ArrowUpRight size={22} /></ContentLink> : itemText(item, index, "title", "h3")}</div>
      {itemText(item, index, "meta", "p", "ws-person-role")}{itemText(item, index, "text", "p", "ws-person-text")}
      {item.tags?.length ? <div className="ws-person-tags">{item.tags.map((tag, i) => <EditableText as="span" value={tag} editable={editable} key={i} onChange={(value) => updateItem(index, "tags", item.tags!.map((entry, n) => n === i ? value : entry))} />)}</div> : null}
      {(item.email || item.phone) && <div className="ws-person-contact">{item.email && <ContentLink href={`mailto:${item.email}`} editable={editable} label={teamEmailLabel(item)}><Mail size={17} /><span>{item.label === "Sekretariat" ? "Sekretariat: " : ""}{item.email}</span></ContentLink>}{item.phone && <ContentLink href={`tel:${item.phone.replace(/[^+\d]/g, "")}`} editable={editable}><Phone size={16} />{item.phone}</ContentLink>}</div>}
    </article>)}</div>{actions("ws-section-bottom-actions")}</>; break;
    case "split": body = <div className={`ws-split-layout ws-image-${d.imageSide}`}>{image("ws-split-image")}<div className="ws-split-copy">{heading()}{c.subheading && text("subheading", "p", "ws-section-subheading")}{text("text", "p", "ws-split-text")}{items.length > 0 && <ul className="ws-split-facts">{items.map((item, index) => <li key={item.id} data-item-id={item.id}><ContentIcon name={item.icon} editable={editable} itemId={item.id} sectionId={section.id} /><div>{itemText(item, index, "title", "h3")}{itemText(item, index, "text")}</div></li>)}</ul>}{actions()}</div></div>; break;
    case "contact": body = <>{intro("ws-contact-intro")}<div className={site.phone || site.email || site.address ? "ws-contact-layout" : "ws-contact-layout seb-contact-single"}>{(site.phone || site.email || site.address) && <div className="ws-contact-info">
      <ContentLink href={`tel:${site.phone.replace(/[^+\d]/g, "")}`} editable={editable} className="ws-contact-phone"><Phone size={23} /><span>{site.phone}</span><ArrowUpRight size={22} /></ContentLink>
      <ContentLink href={`mailto:${site.email}`} editable={editable} className="ws-contact-email"><Mail size={21} /><span>{site.email}</span><ArrowUpRight size={20} /></ContentLink>
      <div className="ws-contact-address"><MapPin size={21} /><div><strong>{site.name}</strong><address>{site.address}<br />{site.postalCode} {site.city}</address><ContentLink href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${site.address}, ${site.postalCode} ${site.city}`)}`} editable={editable} className="ws-inline-link" target="_blank">Anfahrt planen<ArrowUpRight size={15} /></ContentLink></div></div>
      <div className="ws-contact-hours"><Clock3 size={21} /><div><h3>Unsere Bürozeiten</h3>{site.openingHours.map((entry) => <p key={entry.day}><span>{entry.day}</span><span>{entry.hours}</span></p>)}</div></div>
      {site.fax && <p className="ws-contact-fax">Fax {site.fax}</p>}
    </div>}<ContactForm editable={editable} copy={c.form} language={language} informal /></div></>; break;
    case "faq": case "accordion": body = <div className="ws-faq-layout"><div>{heading()}{text("text", "p", "ws-section-text")}{actions()}</div><div className="ws-faq-list">{items.map((item, index) => <ContentDisclosure editable={editable} key={item.id} data-item-id={item.id} className="ws-faq-item" summary={<>{itemText(item, index, "title", "h3")}<span className="ws-disclosure-icon"><Plus size={21} /><Minus size={21} /></span></>}><div className="ws-faq-answer">{itemText(item, index, "text")}{details(item, index)}{item.href && <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} className="ws-inline-link">{item.label || "Mehr erfahren"}<ArrowUpRight size={15} /></ContentLink>}</div></ContentDisclosure>)}</div></div>; break;
    case "steps": body = <>{intro()}<ol className="ws-steps">{items.map((item, index) => <li key={item.id} data-item-id={item.id}><span className="ws-step-number" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div>{itemText(item, index, "title", "h3")}{itemText(item, index, "text")}{details(item, index)}</div></li>)}</ol>{actions("ws-section-bottom-actions")}</>; break;
    case "stats": body = <>{intro()}<dl className="ws-stats">{items.map((item, index) => <div key={item.id} data-item-id={item.id}><dt>{itemText(item, index, "text", "span")}</dt><dd>{itemText(item, index, "title", "span")}</dd>{item.meta && itemText(item, index, "meta", "p")}</div>)}</dl></>; break;
    case "gallery": body = <>{intro()}<div className="ws-gallery">{(c.images ?? []).map((entry, index) => <EditableImage key={index} image={entry} editable={editable} className="ws-gallery-image" caption onOpen={button => gallery.openImage(index, button)} onChange={(value) => update("images", c.images!.map((current, i) => index === i ? value : current))} />)}</div>{actions()}{!editable && gallery.lightbox}</>; break;
    case "richtext": body = <div className="ws-richtext"><header className="ws-richtext-header">{heading()}{c.subheading && text("subheading", "p", "ws-section-subheading")}{c.image && image("ws-richtext-image")}{actions()}</header><div className="ws-richtext-reading">{text("text", "div", "ws-richtext-body")}{items.map((item, index) => <article key={item.id} data-item-id={item.id} className="ws-richtext-block">{itemText(item, index, "title", "h3")}{itemText(item, index, "text", "p")}{details(item, index)}{item.href && <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} className="ws-inline-link">{item.label || item.href}<ArrowUpRight size={16} /></ContentLink>}</article>)}</div></div>; break;
    case "cta": body = <div className="ws-cta-layout"><div>{heading("ws-cta-heading")}{text("text", "p", "ws-cta-text")}</div>{actions("ws-cta-actions")}</div>; break;
    case "affiliate-links": case "cards": body = <>{intro()}<div className="ws-editorial-cards">{items.map((item, index) => <article key={item.id} data-item-id={item.id} className="ws-editorial-card">{section.type === "affiliate-links" && item.tags?.includes("affiliate") && <p className="seb-sponsor-label">{language === "en" ? "Advertising · affiliate link" : "Werbung · Affiliate-Link"}</p>}{item.image ? itemImage(item, index) : <span className="ws-editorial-card-icon"><ContentIcon name={item.icon} size={29} editable={editable} itemId={item.id} sectionId={section.id} /></span>}{itemText(item, index, "meta", "span", "ws-card-meta")}{itemText(item, index, "title", "h3")}{itemText(item, index, "text")}{details(item, index)}{item.href && <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} className="ws-inline-link" sponsored={section.type === "affiliate-links" && item.tags?.includes("affiliate")} target={section.type === "affiliate-links" ? "_blank" : undefined}>{item.label || (language === "en" ? "Read more" : "Weiterlesen")}<ArrowUpRight size={18} /></ContentLink>}</article>)}</div>{actions()}</>; break;
    case "list": body = <>{intro()}<ul className="ws-content-list">{items.map((item, index) => <li key={item.id} data-item-id={item.id}><span className="ws-list-check"><ContentIcon name={item.icon || "check"} size={21} editable={editable} itemId={item.id} sectionId={section.id} /></span><div>{itemText(item, index, "title", "h3")}{itemText(item, index, "text")}{details(item, index)}</div>{item.href && <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} label={item.label || `${item.title} öffnen`} className="ws-list-arrow"><ArrowUpRight size={24} /></ContentLink>}</li>)}</ul>{actions()}</>; break;
    case "downloads": body = <>{intro()}<div className="ws-downloads">{items.map((item, index) => <article key={item.id} data-item-id={item.id}><span className="ws-download-file"><FileText size={28} /></span><div>{itemText(item, index, "title", "h3")}{itemText(item, index, "text")}{itemText(item, index, "meta", "span", "ws-download-meta")}</div><ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} className="ws-download-button" label={`${item.label || "Herunterladen"} – ${item.title}`} download><ArrowDownToLine size={22} /><span>{item.label || "Herunterladen"}</span></ContentLink></article>)}</div></>; break;
    case "quote": body = <figure className="ws-quote">{c.image && image("ws-quote-portrait")}<div>{c.heading && heading("ws-quote-heading")}{text("quote", "blockquote", "ws-quote-text")}<figcaption>{text("attribution", "span", "ws-quote-attribution")}{c.text && text("text", "span", "ws-quote-caption")}</figcaption></div></figure>; break;
    case "logos": body = <>{intro()}<div className="ws-logos">{(c.images ?? []).map((entry, index) => <EditableImage key={`image-${index}`} image={entry} editable={editable} className="ws-logo-image" onChange={(value) => update("images", c.images!.map((current, i) => index === i ? value : current))} />)}{items.map((item, index) => <div key={item.id} data-item-id={item.id}>{item.image ? itemImage(item, index, "ws-logo-image") : itemText(item, index, "title", "h3")}{item.image && itemText(item, index, "title", "p")}{itemText(item, index, "text", "p")}{item.href && <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} label={`${item.label || "Zur Website"} – ${item.title}`} className="ws-inline-link">{item.label || "Zur Website"}<ArrowUpRight size={15} /></ContentLink>}</div>)}</div></>; break;
    case "video": body = <>{intro()}<ExternalMedia kind="video" url={c.videoUrl} title={c.heading} editable={editable} language={language} poster={c.image?.src ? image("seb-video-poster") : undefined} />{text("caption", "p", "ws-media-caption")}</>; break;
    case "map": body = <div className="ws-map-layout"><div>{heading()}{text("text", "p", "ws-section-text")}<address className="ws-map-address">{site.address}<br />{site.postalCode} {site.city}</address>{actions()}</div><ExternalMedia kind="map" address={c.mapAddress || `${site.legalName}, ${site.address}, ${site.postalCode} ${site.city}`} url={c.videoUrl} title={c.heading} editable={editable} /></div>; break;
    case "divider": body = <div className="ws-divider">{c.heading && heading("ws-divider-heading")}<hr />{text("text", "p")}</div>; break;
    case "timeline": body = <>{intro()}<ol className="ws-timeline">{items.map((item, index) => <li key={item.id} data-item-id={item.id}><div className="ws-timeline-date">{itemText(item, index, item.meta ? "meta" : "title", "span")}</div><span className="ws-timeline-dot" aria-hidden="true" /><div className="ws-timeline-content">{item.meta && itemText(item, index, "title", "h3")}{itemText(item, index, "text")}{(item.image || editable) && itemImage(item, index, "ws-timeline-image")}{details(item, index)}</div></li>)}</ol>{actions("ws-section-bottom-actions")}</>; break;
    case "announcement": body = <div className="ws-announcement">
      <span className="ws-announcement-icon" aria-hidden="true"><CalendarDays size={22} strokeWidth={1.6} /></span>
      <div className="ws-announcement-copy">{c.subheading && text("subheading", "p", "ws-announcement-period")}{heading("ws-announcement-heading")}{c.text && text("text", "p", "ws-announcement-text")}</div>
      {c.primaryLabel && c.primaryHref && <ContentLink href={c.primaryHref} editField="primaryHref" editable={editable} className="ws-announcement-link">{c.primaryLabel}<ArrowUpRight size={17} /></ContentLink>}
    </div>; break;
    case "notice": body = <aside className="ws-notice"><Info size={27} /><div>{heading("ws-notice-heading")}{text("text", "p", "ws-notice-text")}{actions()}</div></aside>; break;
    case "coaching-comparison": body = <>
      {intro("seb-comparison-intro")}
      <CoachingComparison items={items} editable={editable} language={language}
        renderImage={(item, index, panel) => (
          <EditableImage image={item[panel]} editable={editable} className="seb-comparison-image"
            onChange={value => updateItem(index, panel, value)}
            editLabel={language === "en" ? (panel === "image" ? "Edit before photo" : "Edit after photo") : (panel === "image" ? "Vorher-Bild bearbeiten" : "Nachher-Bild bearbeiten")} />
        )}
        renderCopy={(item, index) => <>{itemText(item, index, "title", "h3")}{itemText(item, index, "text")}</>} />
      {actions("ws-section-bottom-actions")}
    </>; break;
    case "comparison": body = <>{intro()}<div className="ws-comparison">{items.map((item, index) => <article key={item.id} data-item-id={item.id}>{itemText(item, index, "title", "h3")}{itemText(item, index, "meta", "p", "ws-comparison-meta")}{itemText(item, index, "text")}{details(item, index)}{item.href && <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} className="ws-button ws-button-outline">{item.label || "Mehr erfahren"}<ArrowUpRight size={17} /></ContentLink>}</article>)}</div></>; break;
    case "columns": body = <>{intro()}<div className="ws-content-columns">{items.map((item, index) => <article key={item.id} data-item-id={item.id}>{item.image && itemImage(item, index)}{itemText(item, index, "title", "h3")}{itemText(item, index, "text")}{details(item, index)}{item.href && <ContentLink href={item.href} editField="href" editItemId={item.id} editable={editable} className="ws-inline-link">{item.label || "Mehr erfahren"}<ArrowUpRight size={16} /></ContentLink>}</article>)}</div></>; break;
    case "opening-hours": body = <div className="ws-hours-layout"><div>{heading()}{text("text", "p", "ws-section-text")}{actions()}</div><div className="ws-hours-table">{items.length ? items.map((item, index) => <div key={item.id} data-item-id={item.id}>{itemText(item, index, "title", "h3")}{itemText(item, index, "text")}</div>) : site.openingHours.map((entry) => <div key={entry.day}><h3>{entry.day}</h3><p>{entry.hours}</p></div>)}</div></div>; break;
    default: body = <>{intro()}{actions()}</>;
  }
  return <section id={section.anchor || section.id} data-section-id={section.id} data-section-type={section.type} data-theme={d.theme}
    data-ws-section-entrance={sectionEntrance(section.type, d.animation, editable)}
    className={`ws-section ws-section-${section.type} ws-width-${d.width} ws-spacing-${d.spacing} ws-align-${d.align} ws-animation-${d.animation}${editable ? " ws-editable-section" : ""}${selected ? " ws-section-selected" : ""}${!section.visible ? " ws-section-hidden" : ""}`}
    style={style} onClick={editable ? (event) => {
      if ((event.target as HTMLElement).closest("[contenteditable]")) event.preventDefault();
      onSelect?.();
    } : undefined}>
    {editable && <button className="ws-section-select" type="button" onClick={(event) => { event.stopPropagation(); onSelect?.(); }} aria-label={adminText("{p1} auswählen", { p1: section.name })}>{section.name}{!section.visible && <span>{adminText(" · ausgeblendet")}</span>}</button>}
    <div className="ws-section-inner">{body}</div>
  </section>;
}
