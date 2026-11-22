import type { SectionType } from "@/lib/types";

const aliases: Partial<Record<SectionType, SectionType>> = {
  "assistant-showcase":"cards", "affiliate-links":"cards",
  "creator-engagement":"gallery","creator-journey":"cards",
  "creator-scroll-story":"cards","creator-demo":"cards","creator-remix":"cards","creator-lens":"cards","creator-orbit":"cards",
  "creator-hero":"hero","creator-social":"cards","creator-shop":"cards","creator-tools":"cards","creator-hero-stack":"cards","creator-media-kit":"cards","creator-links":"cards",
  "navy-hero": "hero", "navy-bento": "cards", "navy-service-tabs": "services", "navy-people": "team", "navy-process": "steps", "navy-contact": "contact",
  "editorial-hero": "hero", "cinematic-hero": "hero", "noir-hero": "hero",
  "portrait-mosaic": "team", "portrait-rail": "team", "people-index": "team",
  "service-explorer": "services", "focus-finder": "services", "case-deck": "services",
  "editorial-statement": "statement", "kinetic-statement": "statement", "noir-manifesto": "statement",
  "contact-poster": "cta", "contact-dock": "cta", "noir-contact": "cta",
  "editorial-gallery": "gallery", "image-curtain": "gallery", "stacked-panels": "steps",
};
export function sectionBaseType(type: SectionType): SectionType { return aliases[type] || type; }
export function sectionCapabilities(type: SectionType) {
  const base = sectionBaseType(type); const feed = ["blog-cards", "blog-editorial", "blog-list"].includes(type);
  const creatorEditorial = type === "creator-media-kit" || type === "creator-shop";
  const visualItems = ["scroll-story", "scene-sequence", "workflow-demo", "project-stage", "project-index", "project-finder", "editorial-index"].includes(type);
  return {
    base, feed,
    restaurantMenu: type === 'restaurant-menu',
    reservation: type === 'reservation',
    heroLayout: base === "hero" || type === "showcase-hero",
    newsletter: type === 'newsletter-signup',
    showcase: type === 'newsletter-showcase',
    items: visualItems || !feed && ["hero", "services", "team", "split", "faq", "accordion", "steps", "stats", "cards", "list", "downloads", "logos", "timeline", "comparison", "columns", "opening-hours", "richtext", "motion-story", "scroll-3d"].includes(base),
    image: type === "reservation" || type === "creator-lens" || creatorEditorial || ["hero", "split", "statement", "contact", "richtext", "cta", "quote", "notice", "video", "map", "motion-story", "scroll-3d", "showcase-hero"].includes(base),
    gallery: type === "creator-hero" || creatorEditorial || base === "gallery" || base === "logos",
    quote: creatorEditorial || base === "quote",
    itemImages: visualItems || !["assistant-showcase","creator-lens"].includes(type) && ["hero", "services", "team", "split", "cards", "logos", "timeline", "columns", "richtext", "motion-story"].includes(base),
    icons: !["assistant-showcase","creator-lens","creator-scroll-story"].includes(type) && ["services", "split", "cards", "list", "columns"].includes(base),
    columns: ["project-index", "project-finder"].includes(type) || feed || !["assistant-showcase","creator-tools","creator-lens","creator-orbit","creator-remix","creator-scroll-story","creator-engagement","creator-journey"].includes(type) && ["team", "cards", "columns", "stats", "comparison", "gallery", "logos"].includes(base),
    imageSide: ["reservation", "split", "map", "quote", "showcase-hero", "scroll-story", "project-stage", "project-index", "scroll-3d"].includes(base),
  };
}
