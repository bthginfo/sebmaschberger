import type { NavItem, PageContent, SiteConfig, SiteLanguage } from "../types";

export const scriptCategories = ["analytics", "external", "marketing"] as const;
export const scriptContexts = ["sandbox", "page"] as const;
export const scriptKinds = ["url", "inline"] as const;
export const maxConsentScripts = 20;

export type ConsentScriptCategory = typeof scriptCategories[number];
export type ConsentScript = {
  id: string;
  name: string;
  enabled: boolean;
  category: ConsentScriptCategory;
  context: typeof scriptContexts[number];
  kind: typeof scriptKinds[number];
  source: string;
};

export type ConsentBannerCopy = { title: string; text: string };
export type PublicConsentScripts = { generation: string; items: readonly ConsentScript[] };

export const defaultConsentBanner: Record<SiteLanguage, ConsentBannerCopy> = {
  de: { title: "Cookie-Einstellungen", text: "Sie entscheiden, welche optionalen Dienste diese Website laden darf." },
  en: { title: "Cookie settings", text: "Choose which optional services this website may load." },
};

export function configuredConsentBanner(site: SiteConfig, language: SiteLanguage): ConsentBannerCopy {
  return language === "de" ? { title: site.consent.title, text: site.consent.text }
    : site.consent.english ?? site.locales?.en?.consent ?? { title: "", text: "" };
}

export function consentBanner(site: SiteConfig, language: SiteLanguage): ConsentBannerCopy {
  const configured = configuredConsentBanner(site, language);
  const fallback = defaultConsentBanner[language];
  return { title: configured.title.trim() || fallback.title, text: configured.text.trim() || fallback.text };
}

export function secureScriptUrl(value: string): string | null {
  if (!/^https:\/\//i.test(value) || /[\s\\]/.test(value)) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" && !url.username && !url.password ? url.href : null;
  } catch {
    return null;
  }
}

const privateSegments = new Set([
  "admin", "api", "cms", "coach", "demo", "preview", "vorschau", "private", "intern", "portal",
  "login", "logout", "anmelden", "abmelden", "zugang", "auth", "reset", "passwort", "verify", "magic", "token", "studio-embed",
  "member", "members", "members-area", "mitglieder", "mitgliederbereich", "account", "konto",
  "checkout", "kasse", "cart", "warenkorb", "order", "orders", "bestellung", "receipt", "confirmation",
  "projektfreigabe", "widerruf", "withdrawal",
]);

export function publicConsentScriptPage(page: Pick<PageContent, "slug" | "sections" | "seo">): boolean {
  return !page.seo.noindex
    && !page.slug.toLowerCase().split("/").some(part => privateSegments.has(part) || /^[a-f0-9]{24,}$/.test(part))
    && !page.sections.some(section => section.visible && section.type === "creator-shop"
      && ["cart", "checkout", "confirmation"].includes(section.content.caption || ""));
}

export function consentLegalLinks(site: SiteConfig, language: SiteLanguage, pages: readonly Pick<PageContent, "slug">[]): NavItem[] {
  const footer = language === "en" ? site.locales?.en?.footer : site.footer;
  const configured = footer?.legalLinks.filter(link => link.href && link.label.trim());
  if (configured?.length) return configured;
  const hasPage = (href: string) => pages.some(page => "/" + page.slug === href);
  const alternatives: readonly [string, string, string, string][] = [
    ["/en/privacy", "Privacy", "/datenschutz", "Datenschutz"],
    ["/en/legal", "Legal notice", "/impressum", "Impressum"],
  ];
  const fallback = alternatives.flatMap(([en, enLabel, de, deLabel]) => language === "en" && hasPage(en)
    ? [{ href: en, label: enLabel }]
    : hasPage(de) ? [{ href: de, label: language === "en" ? enLabel : deLabel }] : []);
  return fallback.length ? fallback : site.footer?.legalLinks ?? [];
}

export function consentScriptDefinitionKey(scripts: readonly ConsentScript[]): string {
  return JSON.stringify(scripts.map(({ id, name, category, context, kind, source }) => [id, name, category, context, kind, source]));
}
