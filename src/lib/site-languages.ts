import type { PageContent, SiteConfig, SiteLanguage } from "./types";

export function languageForSlug(slug: string): SiteLanguage {
  return slug === "en" || slug.startsWith("en/") ? "en" : "de";
}

export function localeForSlug(slug: string) {
  return languageForSlug(slug) === "en" ? "en-GB" : "de-DE";
}

export function localizedSite(site: SiteConfig, language: SiteLanguage): SiteConfig {
  const copy = language === "en" ? site.locales?.en : undefined;
  if (!copy) return site;
  return {
    ...site,
    ...copy,
    consent: { ...site.consent, ...copy.consent },
  };
}

type TranslationPage = Pick<PageContent, "slug" | "translationKey">;
export type TranslationSlugs = Partial<Record<SiteLanguage, string>>;

export function hasBilingualHomepage(pages: readonly Pick<PageContent, "slug">[]) {
  const slugs = new Set(pages.map(page => page.slug));
  return slugs.has("") && slugs.has("en") && !slugs.has("de");
}

export function websiteHomeSlug(site: Pick<SiteConfig, "defaultWebsiteLanguage">, pages: readonly Pick<PageContent, "slug">[]) {
  if (!hasBilingualHomepage(pages)) return "";
  return site.defaultWebsiteLanguage === "de" ? "de" : "en";
}

export function publishedPagePath(slug: string, bilingual = false) {
  return "/" + (slug || (bilingual ? "de" : ""));
}

export function translationSlugs(page: TranslationPage, pages: readonly TranslationPage[]): TranslationSlugs {
  const language = languageForSlug(page.slug);
  const slugs: TranslationSlugs = { [language]: page.slug };
  if (page.translationKey) {
    const alternate = pages.find(candidate =>
      candidate.translationKey === page.translationKey && languageForSlug(candidate.slug) !== language);
    if (alternate) slugs[languageForSlug(alternate.slug)] = alternate.slug;
  }
  return slugs;
}

export function languageSwitchSlugs(page: TranslationPage, pages: readonly TranslationPage[]): TranslationSlugs {
  const slugs = translationSlugs(page, pages);
  if (slugs.de === undefined && pages.some(candidate => candidate.slug === "")) slugs.de = "";
  if (slugs.en === undefined && pages.some(candidate => candidate.slug === "en")) slugs.en = "en";
  if (slugs.de === "" && hasBilingualHomepage(pages)) slugs.de = "de";
  return slugs;
}

export function languageUrls(page: PageContent, pages: readonly PageContent[], base: string, defaultLanguage: SiteLanguage = "en"): Record<string, string> | undefined {
  if (page.seo.noindex) return undefined;
  const available = translationSlugs(page, pages.filter(candidate => !candidate.seo.noindex));
  if (available.de === undefined || available.en === undefined) return undefined;
  const bilingual = hasBilingualHomepage(pages);
  const de = base + publishedPagePath(available.de, bilingual);
  const en = base + publishedPagePath(available.en, bilingual);
  const landing = bilingual && available.de === "" && available.en === "en";
  return { "de-DE": de, "en-GB": en, "x-default": landing ? base + "/" : defaultLanguage === "de" ? de : en };
}
